import "server-only";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as fs from "node:fs";
import * as path from "node:path";

import * as schema from "./schema";

/**
 * Resolve the SQLite file location:
 *   - Production / dev: DATABASE_URL=file:./data/linkao.db (default)
 *   - Tests: pass :memory: or a temp file via env
 *
 * The file is opened with WAL mode for concurrent read/write safety and
 * `synchronous=NORMAL` for the standard durability/throughput trade-off.
 */
function resolveDbPath(): string {
  const url = process.env.DATABASE_URL ?? "file:./data/linkao.db";
  if (url.startsWith("file:")) {
    const rel = url.slice("file:".length);
    return path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);
  }
  if (url === ":memory:") return url;
  return url;
}

const dbPath = resolveDbPath();

// Ensure parent directory exists (only for file-backed DBs).
if (dbPath !== ":memory:") {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("synchronous = NORMAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export type DB = typeof db;

// Re-export schema for convenience (e.g. `import { db, users } from "@/lib/db"`).
export * from "./schema";
