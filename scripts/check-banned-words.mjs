#!/usr/bin/env node
/**
 * 学术诚信红线词扫描 (Phase 1 合规守门)
 *
 * Triggered as a Husky pre-commit hook on staged files.
 * Reject the commit if any tracked source contains a banned-word completed
 * form. The banned list itself is split with middle dots so this script
 * (and the docs that explain the rule) don't trip themselves.
 *
 * White-listed paths: ops/day0-account-prerequisite.md (the rule list itself)
 * and this script.
 *
 * Usage:
 *   node scripts/check-banned-words.mjs <file1> <file2> ...
 *   (lint-staged passes staged file paths as argv)
 */

import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

// Each banned token is reconstructed by joining its parts. The split form
// keeps this very file out of its own scan results.
const BANNED = [
  ["代", "写"],
  ["作", "弊"],
  ["包", "过"],
  ["保", "过"],
  ["100%", "通过"],
  ["替", "考"],
  ["改", "成绩"],
];

const ALLOWED_PATHS = new Set([
  "ops/day0-account-prerequisite.md",
  "scripts/check-banned-words.mjs",
  // The vibe runtime sometimes echoes user prompts into governance artifacts.
  // Those live in docs/ and outputs/ and are read-only audit data, not product
  // copy that ships to users — exclude them from this lint.
]);

const SCAN_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".md",
  ".mdx",
  ".html",
  ".json",
  ".yml",
  ".yaml",
  ".css",
  ".sql",
]);

const args = process.argv.slice(2);
const repoRoot = resolve(process.cwd());

let hits = 0;

for (const fileArg of args) {
  const abs = resolve(repoRoot, fileArg);
  const relUnix = fileArg.replace(/\\/g, "/");

  if (ALLOWED_PATHS.has(relUnix)) continue;
  if (relUnix.startsWith("docs/")) continue; // governance audit artifacts
  if (relUnix.startsWith("outputs/")) continue; // vibe runtime sessions

  const dot = relUnix.lastIndexOf(".");
  const ext = dot >= 0 ? relUnix.slice(dot) : "";
  if (!SCAN_EXTENSIONS.has(ext)) continue;

  let content;
  try {
    if (!statSync(abs).isFile()) continue;
    content = readFileSync(abs, "utf8");
  } catch {
    continue;
  }

  for (const parts of BANNED) {
    const joined = parts.join("");
    if (content.includes(joined)) {
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(joined)) {
          console.error(
            `❌  ${relUnix}:${i + 1}  contains banned word "${joined}"`,
          );
          console.error(`     -> ${lines[i].trim().slice(0, 120)}`);
          hits++;
        }
      }
    }
  }
}

if (hits > 0) {
  console.error(
    `\nCommit blocked: ${hits} banned-word hit(s). See ops/day0-account-prerequisite.md for the rule list and rationale.`,
  );
  console.error(
    `If a hit is intentional internal compliance documentation, add the exact path to ALLOWED_PATHS in scripts/check-banned-words.mjs.`,
  );
  process.exit(1);
}

process.exit(0);
