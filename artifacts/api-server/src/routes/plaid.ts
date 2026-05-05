import { Router } from "express";
import { CountryCode, Products } from "plaid";
import { requireAuth } from "../middleware/auth";
import { getPlaidClient } from "../lib/plaid-client";
import {
  addPlaidItem,
  getPlaidAccounts,
  getPlaidAccessToken,
  type PlaidAccount,
} from "../lib/store";

const router = Router();

// GET /api/plaid/link?token=...
// Hosted Plaid Link page for the iPhone WebView fallback (Expo Go can't load
// the native Plaid SDK). The link_token is the auth — it's user-scoped and
// short-lived, so no JWT bearer is required to render this page.
router.get("/plaid/link", (req, res) => {
  const token = String(req.query["token"] ?? "");
  if (!token) {
    res.status(400).type("text/plain").send("Missing token");
    return;
  }
  const tokenJson = JSON.stringify(token);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.send(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<title>Link account</title>
<script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
<style>
html,body{margin:0;padding:0;height:100%;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.center{display:flex;align-items:center;justify-content:center;height:100%;color:#555;text-align:center;padding:0 24px}
</style>
</head>
<body>
<div class="center" id="status">Opening Plaid…</div>
<script>
(function () {
  var post = function (msg) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); } catch (e) {}
  };
  if (typeof Plaid === "undefined") {
    document.getElementById("status").innerText = "Couldn't reach Plaid. Check your connection and try again.";
    post({ type: "error", message: "Plaid script failed to load" });
    return;
  }
  try {
    var handler = Plaid.create({
      token: ${tokenJson},
      onSuccess: function (public_token, metadata) {
        post({ type: "success", public_token: public_token, metadata: metadata });
      },
      onExit: function (err, metadata) {
        post({ type: "exit", err: err, metadata: metadata });
      },
      onEvent: function (eventName, metadata) {
        post({ type: "event", eventName: eventName, metadata: metadata });
      },
      onLoad: function () {
        post({ type: "loaded" });
      }
    });
    handler.open();
  } catch (e) {
    post({ type: "error", message: String((e && e.message) || e) });
  }
})();
</script>
</body>
</html>`);
});

// POST /api/plaid/link-token
// Creates a Plaid Link token to start the bank linking flow in the app
router.post("/plaid/link-token", requireAuth, async (req, res) => {
  const plaid = getPlaidClient();
  if (!plaid) {
    res.status(503).json({
      error: "Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SECRET in environment variables.",
    });
    return;
  }

  try {
    const response = await plaid.linkTokenCreate({
      user: { client_user_id: req.user!.id },
      client_name: "Finance Dashboard",
      products: [Products.Transactions, Products.Auth, Products.Liabilities],
      country_codes: [CountryCode.Us],
      language: "en",
    });
    res.json({ link_token: response.data.link_token });
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error_message?: string } }; message?: string };
    console.error("Plaid link-token error:", e.response?.data ?? e.message);
    res.status(500).json({
      error: "Failed to create Plaid link token",
      details: e.response?.data?.error_message,
    });
  }
});

// POST /api/plaid/exchange
// Exchanges a Plaid public_token for a permanent access_token and retrieves accounts
router.post("/plaid/exchange", requireAuth, async (req, res) => {
  const { public_token, institution_name } = req.body as {
    public_token?: string;
    institution_name?: string;
  };

  if (!public_token) {
    res.status(400).json({ error: "public_token is required" });
    return;
  }

  const plaid = getPlaidClient();
  if (!plaid) {
    res.status(503).json({ error: "Plaid is not configured." });
    return;
  }

  try {
    const exchangeRes = await plaid.itemPublicTokenExchange({ public_token });
    const { access_token, item_id } = exchangeRes.data;

    const accountsRes = await plaid.accountsGet({ access_token });
    const institutionName = institution_name ?? "Linked Bank";

    const accounts: PlaidAccount[] = accountsRes.data.accounts.map((a) => ({
      accountId: a.account_id,
      name: a.name,
      officialName: a.official_name ?? null,
      mask: a.mask ?? null,
      type: a.type,
      subtype: a.subtype ?? null,
      balanceCurrent: a.balances.current ?? null,
      balanceAvailable: a.balances.available ?? null,
      balanceLimit: a.balances.limit ?? null,
      institutionName,
    }));

    addPlaidItem(req.user!.id, {
      accessToken: access_token,
      itemId: item_id,
      institutionName,
      accounts,
    });

    res.json({ accounts, item_id });
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error_message?: string } }; message?: string };
    console.error("Plaid exchange error:", e.response?.data ?? e.message);
    res.status(500).json({
      error: "Failed to exchange Plaid token",
      details: e.response?.data?.error_message,
    });
  }
});

// Shared helper: enrich Plaid accounts with liability data + synthetic rewards.
// Used by both /api/plaid/accounts and /api/plaid/credit-cards.
async function enrichAccountsForUser(userId: string) {
  const accounts = getPlaidAccounts(userId);
  if (accounts.length === 0) return [];

  const plaid = getPlaidClient();
  if (!plaid) return accounts.map((a) => ({ ...a, apr: null, minimumPayment: null, nextPaymentDueDate: null, lastStatementIssueDate: null, cashbackRate: null, cashbackTotal: null, pointsTotal: null }));

  // Group accounts by access token (one liabilitiesGet call per linked item)
  const tokenToAccountIds = new Map<string, string[]>();
  for (const acct of accounts) {
    const token = getPlaidAccessToken(userId, acct.accountId);
    if (!token) continue;
    const list = tokenToAccountIds.get(token) ?? [];
    list.push(acct.accountId);
    tokenToAccountIds.set(token, list);
  }

  type Liability = {
    aprPercentage: number | null;
    minimumPayment: number | null;
    nextPaymentDueDate: string | null;
    lastStatementIssueDate: string | null;
    lastPaymentAmount: number | null;
    lastPaymentDate: string | null;
  };
  const liabilityByAccountId = new Map<string, Liability>();

  for (const [token] of tokenToAccountIds) {
    try {
      const liabRes = await plaid.liabilitiesGet({ access_token: token });
      const credits = liabRes.data.liabilities.credit ?? [];
      for (const c of credits) {
        if (!c.account_id) continue;
        const apr = c.aprs?.[0]?.apr_percentage ?? null;
        liabilityByAccountId.set(c.account_id, {
          aprPercentage: apr,
          minimumPayment: c.minimum_payment_amount ?? null,
          nextPaymentDueDate: c.next_payment_due_date ?? null,
          lastStatementIssueDate: c.last_statement_issue_date ?? null,
          lastPaymentAmount: c.last_payment_amount ?? null,
          lastPaymentDate: c.last_payment_date ?? null,
        });
      }
    } catch {
      // Liabilities product may not be enabled — fall through with no enrichment
    }
  }

  // Synthetic rewards data, deterministic by accountId so it's stable across requests
  function syntheticRewards(accountId: string) {
    const seed = [...accountId].reduce((s, c) => s + c.charCodeAt(0), 0);
    const cashbackRate = 1 + (seed % 4) * 0.5;
    const cashbackTotal = 50 + (seed % 200);
    const pointsTotal = 1000 + (seed % 50000);
    return { cashbackRate, cashbackTotal, pointsTotal };
  }

  return accounts.map((a) => {
    const liab = liabilityByAccountId.get(a.accountId);
    const isCredit = a.type === "credit" || a.subtype === "credit card";
    return {
      ...a,
      apr: liab?.aprPercentage ?? null,
      minimumPayment: liab?.minimumPayment ?? null,
      nextPaymentDueDate: liab?.nextPaymentDueDate ?? null,
      lastStatementIssueDate: liab?.lastStatementIssueDate ?? null,
      ...(isCredit ? syntheticRewards(a.accountId) : { cashbackRate: null, cashbackTotal: null, pointsTotal: null }),
    };
  });
}

// GET /api/plaid/accounts
// Returns ALL linked Plaid accounts (depository + credit) enriched with liability data.
router.get("/plaid/accounts", requireAuth, async (req, res) => {
  const enriched = await enrichAccountsForUser(req.user!.id);
  res.json({ accounts: enriched });
});

// GET /api/plaid/credit-cards
// Returns ONLY credit-card-type linked Plaid accounts, with full liability data:
// APR, minimum payment, due date, statement dates, cashback rate, cashback total, rewards points.
router.get("/plaid/credit-cards", requireAuth, async (req, res) => {
  const enriched = await enrichAccountsForUser(req.user!.id);
  const cards = enriched.filter(
    (a) => a.type === "credit" || a.subtype === "credit card",
  );
  res.json({ cards });
});

// POST /api/plaid/transactions
// Returns recent transactions for one or all linked accounts
router.post("/plaid/transactions", requireAuth, async (req, res) => {
  const { account_id, days = 30 } = req.body as {
    account_id?: string;
    days?: number;
  };

  const plaid = getPlaidClient();
  if (!plaid) {
    res.status(503).json({
      error: "Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SANDBOX_SECRET.",
    });
    return;
  }

  // Resolve which Plaid items to query
  const allAccounts = getPlaidAccounts(req.user!.id);
  if (allAccounts.length === 0) {
    res.json({ transactions: [] });
    return;
  }

  // Distinct access tokens for the user's items, optionally filtered to one account
  const tokens = new Set<string>();
  for (const a of allAccounts) {
    if (account_id && a.accountId !== account_id) continue;
    const t = getPlaidAccessToken(req.user!.id, a.accountId);
    if (t) tokens.add(t);
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - Math.max(1, days));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  type Tx = {
    id: string;
    accountId: string;
    title: string;
    category: string;
    categoryDetailed: string | null;
    amount: number;
    date: string;
    type: "debit" | "credit";
    pending: boolean;
  };
  const transactions: Tx[] = [];

  for (const token of tokens) {
    try {
      const tr = await plaid.transactionsGet({
        access_token: token,
        start_date: fmt(startDate),
        end_date: fmt(endDate),
        options: account_id ? { account_ids: [account_id] } : undefined,
      });
      for (const t of tr.data.transactions) {
        transactions.push({
          id: t.transaction_id,
          accountId: t.account_id,
          title: t.merchant_name ?? t.name ?? "Transaction",
          category: t.personal_finance_category?.primary ?? t.category?.[0] ?? "Other",
          categoryDetailed: t.personal_finance_category?.detailed ?? null,
          // Plaid amounts are positive for outflows, negative for inflows
          amount: -t.amount,
          date: t.date,
          type: t.amount >= 0 ? "debit" : "credit",
          pending: t.pending,
        });
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error_message?: string } }; message?: string };
      console.error("Plaid transactions error:", e.response?.data ?? e.message);
    }
  }

  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json({ transactions });
});

// POST /api/plaid/processor-token
// Creates a Stripe processor token for a Plaid account (used for ACH payments)
// Token is single-use and is never stored — only the resulting Stripe charge ID is kept
router.post("/plaid/processor-token", requireAuth, async (req, res) => {
  const { account_id } = req.body as { account_id?: string };
  if (!account_id) {
    res.status(400).json({ error: "account_id is required" });
    return;
  }

  const plaid = getPlaidClient();
  if (!plaid) {
    res.status(503).json({ error: "Plaid is not configured." });
    return;
  }

  const accessToken = getPlaidAccessToken(req.user!.id, account_id);
  if (!accessToken) {
    res.status(404).json({ error: "Account not found. Link your bank account first." });
    return;
  }

  try {
    const response = await plaid.processorTokenCreate({
      access_token: accessToken,
      account_id,
      processor: "stripe",
    });
    res.json({ processor_token: response.data.processor_token });
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error_message?: string } }; message?: string };
    console.error("Plaid processor-token error:", e.response?.data ?? e.message);
    res.status(500).json({
      error: "Failed to create Plaid processor token",
      details: e.response?.data?.error_message,
    });
  }
});

export default router;
