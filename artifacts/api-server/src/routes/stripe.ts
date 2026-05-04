import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getStripeClient } from "../lib/stripe-client";
import { getPlaidClient } from "../lib/plaid-client";
import {
  getPlaidAccessToken,
  addScheduledPaymentRecord,
  getScheduledPaymentRecords,
  type ScheduledPaymentRecord,
} from "../lib/store";

const router = Router();

// POST /api/stripe/charge
// Processes an ACH payment using a Plaid processor token.
// Raw card or bank account numbers are never stored — only the resulting charge ID.
router.post("/stripe/charge", requireAuth, async (req, res) => {
  const {
    processor_token,
    amount,
    currency = "usd",
    description,
  } = req.body as {
    processor_token?: string;
    amount?: number;
    currency?: string;
    description?: string;
  };

  if (!processor_token) {
    res.status(400).json({ error: "processor_token is required" });
    return;
  }
  if (!amount || amount <= 0) {
    res.status(400).json({ error: "amount must be a positive number (in dollars)" });
    return;
  }

  const stripe = getStripeClient();
  if (!stripe) {
    res.status(503).json({
      error: "Stripe is not configured. Set STRIPE_SECRET_KEY in environment variables.",
    });
    return;
  }

  try {
    const amountCents = Math.round(amount * 100);

    // Find or create a Stripe customer for this user (keyed by beta-user ID)
    const existing = await stripe.customers.list({
      metadata: { userId: req.user!.id },
      limit: 1,
    });
    const customer =
      existing.data.length > 0
        ? existing.data[0]
        : await stripe.customers.create({
            email: req.user!.email ?? undefined,
            metadata: { userId: req.user!.id },
          });

    // Use the Plaid processor token to create a Stripe bank account token
    // The processor_token is single-use; only the resulting charge ID is retained
    const bankAccountToken = await stripe.tokens.create({
      bank_account: { token: processor_token } as Parameters<typeof stripe.tokens.create>[0]["bank_account"],
    });

    const bankSource = await stripe.customers.createSource(customer.id, {
      source: bankAccountToken.id,
    });

    const charge = await stripe.charges.create({
      amount: amountCents,
      currency,
      customer: customer.id,
      source: bankSource.id,
      description: description ?? "Finance Dashboard ACH Payment",
    });

    res.json({
      success: true,
      charge_id: charge.id,
      amount: charge.amount / 100,
      currency: charge.currency,
      status: charge.status,
    });
  } catch (err: unknown) {
    const e = err as { message?: string; type?: string };
    console.error("Stripe charge error:", e.message);
    res.status(500).json({ error: "Payment failed", details: e.message });
  }
});

// POST /api/stripe/payment-intent
// Creates a Stripe PaymentIntent for client-side payment confirmation flows
router.post("/stripe/payment-intent", requireAuth, async (req, res) => {
  const {
    amount,
    currency = "usd",
    description,
  } = req.body as {
    amount?: number;
    currency?: string;
    description?: string;
  };

  if (!amount || amount <= 0) {
    res.status(400).json({ error: "amount must be a positive number (in dollars)" });
    return;
  }

  const stripe = getStripeClient();
  if (!stripe) {
    res.status(503).json({ error: "Stripe is not configured. Set STRIPE_SECRET_KEY." });
    return;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      description: description ?? "Finance Dashboard Payment",
      automatic_payment_methods: { enabled: true },
    });

    res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    res.status(500).json({ error: "Failed to create payment intent", details: e.message });
  }
});

// POST /api/stripe/pay-all
// Single ACH payment covering multiple card balances in one charge.
// Accepts a Plaid-linked bank account ID and a per-card amounts map.
// Internally creates a Plaid processor token → Stripe bank account → charge.
router.post("/stripe/pay-all", requireAuth, async (req, res) => {
  const { account_id, amounts, description } = req.body as {
    account_id?: string;
    amounts?: Record<string, number>;
    description?: string;
  };

  if (!account_id) {
    res.status(400).json({ error: "account_id is required" });
    return;
  }
  if (!amounts || Object.keys(amounts).length === 0) {
    res.status(400).json({ error: "amounts must be a non-empty object mapping cardId → dollar amount" });
    return;
  }

  const total = Object.values(amounts).reduce((sum, a) => sum + a, 0);
  if (total <= 0) {
    res.status(400).json({ error: "Total amount must be greater than zero" });
    return;
  }

  const plaid = getPlaidClient();
  if (!plaid) {
    res.status(503).json({ error: "Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SANDBOX_SECRET." });
    return;
  }

  const stripe = getStripeClient();
  if (!stripe) {
    res.status(503).json({ error: "Stripe is not configured. Set STRIPE_SECRET_KEY." });
    return;
  }

  const accessToken = getPlaidAccessToken(req.user!.id, account_id);
  if (!accessToken) {
    res.status(404).json({ error: "Bank account not found. Link your bank account first via /api/plaid/link-token." });
    return;
  }

  try {
    const processorRes = await plaid.processorTokenCreate({
      access_token: accessToken,
      account_id,
      processor: "stripe",
    });
    const processorToken = processorRes.data.processor_token;

    const existing = await stripe.customers.list({
      metadata: { userId: req.user!.id },
      limit: 1,
    });
    const customer =
      existing.data.length > 0
        ? existing.data[0]
        : await stripe.customers.create({
            email: req.user!.email ?? undefined,
            metadata: { userId: req.user!.id },
          });

    const bankAccountToken = await stripe.tokens.create({
      bank_account: { token: processorToken } as Parameters<typeof stripe.tokens.create>[0]["bank_account"],
    });

    const bankSource = await stripe.customers.createSource(customer.id, {
      source: bankAccountToken.id,
    });

    const cardCount = Object.keys(amounts).length;
    const charge = await stripe.charges.create({
      amount: Math.round(total * 100),
      currency: "usd",
      customer: customer.id,
      source: bankSource.id,
      description: description ?? `CardBridge Pay All — ${cardCount} card${cardCount !== 1 ? "s" : ""}`,
      metadata: { amounts: JSON.stringify(amounts), userId: req.user!.id },
    });

    res.json({
      success: true,
      charge_id: charge.id,
      confirmation_number: `PAY-${charge.id.slice(-8).toUpperCase()}`,
      amount: charge.amount / 100,
      currency: charge.currency,
      status: charge.status,
      cards_paid: cardCount,
    });
  } catch (err: unknown) {
    const e = err as { message?: string; type?: string };
    console.error("Pay All error:", e.message);
    res.status(500).json({ error: "Payment failed", details: e.message });
  }
});

// POST /api/stripe/schedule-payment
// Schedules a future ACH payment across one or more cards.
// Stored in-memory (sandbox); replace with DB insert for production.
router.post("/stripe/schedule-payment", requireAuth, async (req, res) => {
  const { account_id, amounts, date, note } = req.body as {
    account_id?: string;
    amounts?: Record<string, number>;
    date?: string;
    note?: string;
  };

  if (!account_id) {
    res.status(400).json({ error: "account_id is required" });
    return;
  }
  if (!amounts || Object.keys(amounts).length === 0) {
    res.status(400).json({ error: "amounts must be a non-empty object mapping cardId → dollar amount" });
    return;
  }
  if (!date) {
    res.status(400).json({ error: "date is required (YYYY-MM-DD)" });
    return;
  }

  const total = Object.values(amounts).reduce((sum, a) => sum + a, 0);
  if (total <= 0) {
    res.status(400).json({ error: "Total amount must be greater than zero" });
    return;
  }

  const accessToken = getPlaidAccessToken(req.user!.id, account_id);
  if (!accessToken) {
    res.status(404).json({ error: "Bank account not found. Link your bank account first via /api/plaid/link-token." });
    return;
  }

  const id = `sched-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const record: ScheduledPaymentRecord = {
    id,
    userId: req.user!.id,
    accountId: account_id,
    amounts,
    totalAmount: total,
    date,
    note: note ?? "",
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  addScheduledPaymentRecord(req.user!.id, record);

  res.json({
    success: true,
    scheduled_payment: record,
    confirmation_number: `SCHED-${id.slice(-13).toUpperCase()}`,
  });
});

// GET /api/stripe/scheduled-payments
// Returns all pending and completed scheduled payments for the authenticated user.
router.get("/stripe/scheduled-payments", requireAuth, (req, res) => {
  const payments = getScheduledPaymentRecords(req.user!.id);
  res.json({ scheduled_payments: payments });
});

export default router;
