import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getStripeClient } from "../lib/stripe-client";

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
      metadata: { userId: req.userId! },
      limit: 1,
    });
    const customer =
      existing.data.length > 0
        ? existing.data[0]
        : await stripe.customers.create({
            email: req.userEmail,
            metadata: { userId: req.userId! },
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

export default router;
