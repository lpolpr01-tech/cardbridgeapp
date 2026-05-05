import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify<crypto.BinaryLike, crypto.BinaryLike, number, Buffer>(
  crypto.scrypt as any,
);

export type StoredUser = {
  id: string;
  username: string;
  fullName: string;
  dateOfBirth: string;
  passwordHash: string;
  createdAt: number;
};

const usersByUsername = new Map<string, StoredUser>();
const usersById = new Map<string, StoredUser>();

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1]!, "hex");
  const keyExpected = Buffer.from(parts[2]!, "hex");
  const key = await scrypt(password, salt, 64);
  if (key.length !== keyExpected.length) return false;
  return crypto.timingSafeEqual(key, keyExpected);
}

export async function registerUser(input: {
  username: string;
  password: string;
  fullName: string;
  dateOfBirth: string;
}): Promise<StoredUser> {
  const username = input.username.trim().toLowerCase();
  if (!username) throw new Error("Username is required");
  if (input.password.length < 4) throw new Error("Password must be at least 4 characters");
  if (usersByUsername.has(username)) throw new Error("Username already taken");

  const passwordHash = await hashPassword(input.password);
  const user: StoredUser = {
    id: `user-${crypto.randomBytes(8).toString("hex")}`,
    username,
    fullName: input.fullName.trim(),
    dateOfBirth: input.dateOfBirth.trim(),
    passwordHash,
    createdAt: Date.now(),
  };
  usersByUsername.set(username, user);
  usersById.set(user.id, user);
  return user;
}

export function findUserByUsername(username: string): StoredUser | null {
  return usersByUsername.get(username.trim().toLowerCase()) ?? null;
}

export function findUserById(id: string): StoredUser | null {
  return usersById.get(id) ?? null;
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; reason: "not_found" | "wrong_password" }> {
  const user = findUserById(userId);
  if (!user) return { ok: false, reason: "not_found" };
  const matches = await verifyPassword(currentPassword, user.passwordHash);
  if (!matches) return { ok: false, reason: "wrong_password" };
  user.passwordHash = await hashPassword(newPassword);
  return { ok: true };
}
