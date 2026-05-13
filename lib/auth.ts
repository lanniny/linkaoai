import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "@/lib/db";

/**
 * better-auth instance for the whole app.
 *
 * - Drizzle SQLite adapter (single file under /opt/linkao/data/linkao.db).
 * - Email + password is the primary login method (replaces Supabase auth).
 * - Magic link is intentionally left off for now — can be enabled by adding
 *   the magicLink plugin + an emailer (Resend / Postmark) later.
 *
 * Required env:
 *   BETTER_AUTH_SECRET  — 32+ char random (signs session cookies)
 *   BETTER_AUTH_URL     — full https://linkaoai.com on prod; http://localhost:3000 in dev
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 6,
    maxPasswordLength: 200,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh once per day
  },
  user: {
    additionalFields: {
      role: {
        type: "number",
        defaultValue: 0,
        input: false, // never accept role from client signup
      },
    },
  },
  // Trust Linkao's known origins so the same auth session works on
  // production and local dev.
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://linkaoai.com",
    "https://www.linkaoai.com",
  ],
});

export type Session = typeof auth.$Infer.Session;
export type AuthUser = Session["user"];
