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
      products: [Products.Transactions, Products.Auth],
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

// GET /api/plaid/accounts
// Returns all linked Plaid accounts for the authenticated user
router.get("/plaid/accounts", requireAuth, (req, res) => {
  const accounts = getPlaidAccounts(req.user!.id);
  res.json({ accounts });
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
