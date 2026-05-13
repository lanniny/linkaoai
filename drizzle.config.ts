import type { Config } from "drizzle-kit";

// Drizzle Kit config — used by `pnpm drizzle-kit ...` commands locally and
// during deploy. Runtime DB client lives in lib/db/index.ts and reads the
// same DATABASE_URL.
export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./data/linkao.db",
  },
  strict: true,
  verbose: true,
} satisfies Config;
