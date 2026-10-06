// Creates the `public.feedback` table in your Supabase project.
//
// Requires a Supabase *personal access token* (not the anon/service key):
//   Dashboard → Account → Access Tokens → Generate new token  →  sbp_...
//
// Usage (PowerShell):
//   $env:SUPABASE_ACCESS_TOKEN="sbp_..."; pnpm db:create-feedback
//
// Or set SUPABASE_URL + SUPABASE_ACCESS_TOKEN in .env.local and run with dotenv,
// or just paste supabase/feedback.sql into the Supabase SQL editor.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // no .env.local — rely on real env
  }
}

loadEnvLocal();

const url = process.env.SUPABASE_URL;
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!url) {
  console.error("Missing SUPABASE_URL (set it in .env.local).");
  process.exit(1);
}
if (!token || !token.startsWith("sbp_")) {
  console.error(
    "Missing/invalid SUPABASE_ACCESS_TOKEN.\n" +
      "Create one at: Supabase Dashboard → Account → Access Tokens (starts with sbp_),\n" +
      "then set it and re-run:\n" +
      '  $env:SUPABASE_ACCESS_TOKEN="sbp_..."; pnpm db:create-feedback'
  );
  process.exit(1);
}

const ref = new URL(url).hostname.split(".")[0];
const sql = readFileSync(join(__dirname, "..", "supabase", "feedback.sql"), "utf8");

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: sql }),
});

const text = await res.text();
if (!res.ok) {
  console.error(`Failed (HTTP ${res.status}): ${text}`);
  process.exit(1);
}
console.log(`OK — ran supabase/feedback.sql against project ${ref}.\n${text}`);
