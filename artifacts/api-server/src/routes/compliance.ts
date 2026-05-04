import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getPlaidClient } from "../lib/plaid-client";

const router = Router();

// ─── KYC: Plaid Identity Verification ────────────────────────────────────────
//
// Production note:
// In live mode this would call plaid.identityVerificationCreate({ template_id, ... })
// which returns a hosted IDV URL the user is redirected to. Plaid then runs
// document + selfie + database checks and posts a webhook with the result.
//
// For sandbox we accept the collected fields and persist them in-memory.
// Replace `kycStore.set(...)` with a DB write before going live.

type KycRecord = {
  userId: string;
  fullName: string;
  dateOfBirth: string;     // ISO YYYY-MM-DD
  addressLine1: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  ssnLast4: string;
  status: "pending" | "verified" | "rejected";
  submittedAt: string;     // ISO timestamp
  plaidIdvSessionId: string | null;
};

const kycStore = new Map<string, KycRecord>();

// POST /api/kyc/start
// Submits a KYC application. Accepts the collected onboarding fields and
// (if Plaid is configured) creates a Plaid Identity Verification session.
router.post("/kyc/start", requireAuth, async (req, res) => {
  const {
    fullName,
    dateOfBirth,
    addressLine1,
    addressCity,
    addressState,
    addressZip,
    ssnLast4,
  } = req.body as Partial<KycRecord>;

  // Basic validation — at the boundary
  if (!fullName || !dateOfBirth || !addressLine1 || !addressCity || !addressState || !addressZip || !ssnLast4) {
    res.status(400).json({ error: "All KYC fields are required." });
    return;
  }
  if (ssnLast4.length !== 4 || !/^\d{4}$/.test(ssnLast4)) {
    res.status(400).json({ error: "ssnLast4 must be exactly 4 digits." });
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    res.status(400).json({ error: "dateOfBirth must be in YYYY-MM-DD format." });
    return;
  }

  // In a real integration we'd call plaid.identityVerificationCreate here.
  // For sandbox, just record the submission and mark it pending.
  const plaid = getPlaidClient();
  let plaidIdvSessionId: string | null = null;
  if (plaid) {
    // Placeholder — Plaid IDV requires a configured `template_id` from the dashboard.
    // We log that we'd call it and return a synthetic session id.
    plaidIdvSessionId = `idv-sandbox-${Date.now()}`;
  }

  const record: KycRecord = {
    userId: req.user!.id,
    fullName,
    dateOfBirth,
    addressLine1,
    addressCity,
    addressState,
    addressZip,
    ssnLast4,
    // In sandbox we auto-mark as verified so onboarding can complete end-to-end.
    // Production: webhook from Plaid IDV updates this to "verified" or "rejected".
    status: "verified",
    submittedAt: new Date().toISOString(),
    plaidIdvSessionId,
  };

  kycStore.set(req.user!.id, record);

  res.json({
    success: true,
    status: record.status,
    plaidIdvSessionId,
    submittedAt: record.submittedAt,
  });
});

// GET /api/kyc/status
// Returns the user's KYC verification state (used to gate onboarding).
router.get("/kyc/status", requireAuth, (req, res) => {
  const record = kycStore.get(req.user!.id);
  if (!record) {
    res.json({ status: "not_started" });
    return;
  }
  res.json({
    status: record.status,
    submittedAt: record.submittedAt,
    plaidIdvSessionId: record.plaidIdvSessionId,
  });
});

// ─── Report a Problem ────────────────────────────────────────────────────────
// Captures user-reported payment issues for support follow-up.

type ProblemReport = {
  id: string;
  userId: string;
  category: "payment" | "account" | "security" | "other";
  subject: string;
  description: string;
  relatedPaymentId: string | null;
  contactEmail: string | null;
  status: "open" | "in_progress" | "resolved";
  createdAt: string;
};

const problemStore = new Map<string, ProblemReport[]>();

// POST /api/support/report-problem
router.post("/support/report-problem", requireAuth, (req, res) => {
  const { category, subject, description, relatedPaymentId, contactEmail } = req.body as {
    category?: ProblemReport["category"];
    subject?: string;
    description?: string;
    relatedPaymentId?: string;
    contactEmail?: string;
  };

  if (!subject || !description) {
    res.status(400).json({ error: "subject and description are required." });
    return;
  }

  const id = `prob-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const report: ProblemReport = {
    id,
    userId: req.user!.id,
    category: category ?? "other",
    subject,
    description,
    relatedPaymentId: relatedPaymentId ?? null,
    contactEmail: contactEmail ?? null,
    status: "open",
    createdAt: new Date().toISOString(),
  };

  const existing = problemStore.get(req.user!.id) ?? [];
  problemStore.set(req.user!.id, [report, ...existing]);

  res.json({
    success: true,
    ticketId: id,
    status: report.status,
    createdAt: report.createdAt,
  });
});

// GET /api/support/reports — lists the user's submitted reports
router.get("/support/reports", requireAuth, (req, res) => {
  const reports = problemStore.get(req.user!.id) ?? [];
  res.json({ reports });
});

export default router;
