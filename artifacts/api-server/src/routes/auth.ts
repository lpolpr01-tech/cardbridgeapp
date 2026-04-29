import { Router } from "express";
import jwt from "jsonwebtoken";
import { requireAuth } from "../middleware/auth";

const router = Router();

// ─── Beta test user ──────────────────────────────────────────────────────────
// IMPORTANT: This is a single hardcoded user for beta testing only.
// Replace with a real user database before going to production.
const BETA_USER = {
  id: "beta-user-001",
  email: process.env["BETA_USER_EMAIL"] ?? "beta@finapp.com",
  password: process.env["BETA_USER_PASSWORD"] ?? "BetaTest2025!",
  name: "Beta Tester",
};

// POST /api/auth/login
router.post("/auth/login", (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  if (email !== BETA_USER.email || password !== BETA_USER.password) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const secret = process.env["JWT_SECRET"];
  if (!secret) {
    res.status(500).json({ error: "Server misconfiguration: JWT_SECRET is not set" });
    return;
  }

  const token = jwt.sign(
    { userId: BETA_USER.id, email: BETA_USER.email },
    secret,
    { expiresIn: "7d" },
  );

  res.json({
    token,
    user: { id: BETA_USER.id, email: BETA_USER.email, name: BETA_USER.name },
    expiresIn: 7 * 24 * 60 * 60,
  });
});

// GET /api/auth/me — returns the current authenticated user
router.get("/auth/me", requireAuth, (req, res) => {
  res.json({
    id: req.userId,
    email: req.userEmail,
    name: BETA_USER.name,
  });
});

// POST /api/auth/logout — JWT is stateless; client deletes the token
router.post("/auth/logout", (req, res) => {
  res.json({ success: true });
});

export default router;
