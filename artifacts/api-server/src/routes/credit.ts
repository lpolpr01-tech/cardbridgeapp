import { Router, type IRouter } from "express";

const router: IRouter = Router();

const MOCK_CREDIT_PROFILE = {
  userId: "user-001",
  updatedAt: new Date().toISOString(),
  bureaus: [
    { name: "Equifax",    score: 748, change: +12, color: "#6C9EFF", category: "Very Good" },
    { name: "Experian",   score: 741, change: +8,  color: "#4ADEAA", category: "Very Good" },
    { name: "TransUnion", score: 752, change: +15, color: "#A78BFA", category: "Very Good" },
  ],
  creditHealth: {
    overallStatus: "Excellent",
    paymentHistoryPct: 98.7,
    utilizationPct: 22,
    avgAccountAgeYears: 6.4,
    recentInquiries: 1,
    derogatoryMarks: 0,
  },
  debtSummary: {
    totalRevolving: 7250,
    totalInstallment: 18400,
    openAccounts: 4,
    openLoans: 2,
    monthlyMinimum: 620,
    highestBalanceName: "Gold Card",
    highestBalanceAmt: 4200,
    debtToLimitRatio: 0.22,
    creditCards: 7250,
    autoLoans: 12800,
    personalLoans: 0,
    studentLoans: 5600,
    other: 0,
  },
  scoreFactors: [
    {
      id: "payment-history",
      title: "Payment History",
      sentiment: "positive",
      icon: "check-circle",
      impact: "High",
      explanation: "You've made 98.7% of payments on time over the past 24 months. Consistent on-time payments are the single biggest factor in your score.",
    },
    {
      id: "utilization",
      title: "Credit Utilization",
      sentiment: "positive",
      icon: "pie-chart",
      impact: "High",
      explanation: "Your 22% utilization is within the ideal range (below 30%). Keeping balances low relative to limits positively impacts your score.",
    },
    {
      id: "account-age",
      title: "Account Age",
      sentiment: "positive",
      icon: "clock",
      impact: "Medium",
      explanation: "Your average account age of 6.4 years demonstrates a long credit history. Avoid opening many new accounts which lowers this average.",
    },
    {
      id: "inquiries",
      title: "Recent Inquiries",
      sentiment: "neutral",
      icon: "search",
      impact: "Low",
      explanation: "1 hard inquiry in the past 12 months. Hard inquiries from credit applications temporarily lower your score by a few points.",
    },
    {
      id: "derogatory",
      title: "Derogatory Marks",
      sentiment: "positive",
      icon: "shield",
      impact: "High",
      explanation: "No derogatory marks found. Collections, bankruptcies, and charge-offs can severely impact your score for 7–10 years.",
    },
  ],
  recommendations: [
    {
      id: "rec-001",
      icon: "trending-down",
      title: "Pay down Gold Card to below $3,000",
      detail: "Reducing your Gold Card balance from $4,200 to under $3,000 would lower your per-card utilization below 30% and could add 15–25 points.",
      impact: "+15–25 pts",
      priority: "High",
    },
    {
      id: "rec-002",
      icon: "calendar",
      title: "Set up autopay on all accounts",
      detail: "Enrolling all cards in autopay ensures you never miss a due date. Even one missed payment can drop your score by 60–110 points.",
      impact: "Protect score",
      priority: "Medium",
    },
    {
      id: "rec-003",
      icon: "credit-card",
      title: "Request a credit limit increase",
      detail: "Asking your longest-held card issuer for a limit increase (without spending more) can lower your overall utilization ratio.",
      impact: "+10–20 pts",
      priority: "Low",
    },
  ],
};

const MOCK_UTILIZATION_ACCOUNTS = [
  { id: "card-1", name: "Sapphire Reserve", network: "VISA",   limit: 15000, balance: 2800, color: "#6C9EFF" },
  { id: "card-2", name: "Gold Card",        network: "AMEX",   limit: 10000, balance: 4200, color: "#FFD700" },
  { id: "card-3", name: "Ink Business",     network: "VISA",   limit: 8000,  balance: 950,  color: "#4ADEAA" },
  { id: "card-4", name: "Freedom Flex",     network: "MC",     limit: 5000,  balance: 3300, color: "#FF6B8A" },
];

const MOCK_PAYMENT_HISTORY = (() => {
  const history: { date: string; status: "paid" | "missed" | "pending" }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 15);
    const seed = (d.getFullYear() * 12 + d.getMonth()) % 17;
    history.push({
      date: d.toISOString().split("T")[0],
      status: seed === 7 ? "missed" : "paid",
    });
  }
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);
  history.unshift({ date: nextMonth.toISOString().split("T")[0], status: "pending" });
  return history;
})();

router.get("/credit/profile", (_req, res) => {
  res.json({ success: true, data: MOCK_CREDIT_PROFILE });
});

router.get("/credit/score", (_req, res) => {
  const avg = Math.round(MOCK_CREDIT_PROFILE.bureaus.reduce((s, b) => s + b.score, 0) / MOCK_CREDIT_PROFILE.bureaus.length);
  res.json({
    success: true,
    data: {
      averageScore: avg,
      bureaus: MOCK_CREDIT_PROFILE.bureaus,
      updatedAt: MOCK_CREDIT_PROFILE.updatedAt,
    },
  });
});

router.get("/credit/health", (_req, res) => {
  res.json({ success: true, data: MOCK_CREDIT_PROFILE.creditHealth });
});

router.get("/credit/debt", (_req, res) => {
  res.json({ success: true, data: MOCK_CREDIT_PROFILE.debtSummary });
});

router.get("/credit/utilization", (_req, res) => {
  const accounts = MOCK_UTILIZATION_ACCOUNTS.map((a) => ({
    ...a,
    utilizationPct: Math.round((a.balance / a.limit) * 100),
  }));
  const totalLimit = accounts.reduce((s, a) => s + a.limit, 0);
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  res.json({
    success: true,
    data: {
      overallPct: Math.round((totalBalance / totalLimit) * 100),
      totalLimit,
      totalBalance,
      accounts,
    },
  });
});

router.get("/credit/payment-history", (_req, res) => {
  res.json({
    success: true,
    data: {
      onTimePct: MOCK_CREDIT_PROFILE.creditHealth.paymentHistoryPct,
      history: MOCK_PAYMENT_HISTORY,
    },
  });
});

router.get("/credit/factors", (_req, res) => {
  res.json({ success: true, data: MOCK_CREDIT_PROFILE.scoreFactors });
});

router.get("/credit/recommendations", (_req, res) => {
  res.json({ success: true, data: MOCK_CREDIT_PROFILE.recommendations });
});

export default router;
