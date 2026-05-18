import "server-only";

import { createHash, randomBytes } from "node:crypto";

/**
 * M1 mirror · Personal Access Tokens.
 *
 * Token format mirrors OpenAI's sk-* style but namespaces to linkao:
 *   sk-linkao-<32 hex chars>
 *
 * Why sha256 + per-token row (not bcrypt):
 * - bcrypt is built for "verify a few times per login" but PATs would be
 *   verified on every API request — sha256 + indexed unique constraint is
 *   the right shape (constant-time compare on the hash, O(1) DB lookup).
 * - The token already contains 128 bits of entropy from randomBytes; no
 *   need to slow attackers with bcrypt's cost factor.
 *
 * @see app/api/me/tokens · /console/settings PatManager
 */

const TOKEN_PREFIX = "sk-linkao-";
const TOKEN_BYTES = 16; // 32 hex chars
const PREFIX_DISPLAY_LEN = 12; // "sk-linkao-ab" — enough for the user to
//                                identify which row they're looking at

export interface IssuedToken {
  /** The plaintext token — only shown to the user once, never stored. */
  plaintext: string;
  /** First 12 chars, stored on the row for UI identification. */
  prefix: string;
  /** sha256(plaintext) hex digest, stored as the unique row identifier. */
  hash: string;
}

/** Mint a new token. Returns plaintext only this once. */
export function issueToken(): IssuedToken {
  const raw = randomBytes(TOKEN_BYTES).toString("hex");
  const plaintext = `${TOKEN_PREFIX}${raw}`;
  const prefix = plaintext.slice(0, PREFIX_DISPLAY_LEN);
  const hash = hashToken(plaintext);
  return { plaintext, prefix, hash };
}

/** sha256 hex digest. Used both to write and to look up. */
export function hashToken(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

/**
 * Sanity check before hashing — rejects tokens that don't match the format
 * so a wrong-shaped value never gets the chance to collide with a real
 * token's hash by accident.
 */
export function looksLikeToken(s: string): boolean {
  if (!s.startsWith(TOKEN_PREFIX)) return false;
  const tail = s.slice(TOKEN_PREFIX.length);
  return /^[0-9a-f]{32}$/i.test(tail);
}
