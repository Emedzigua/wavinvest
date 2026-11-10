// Sends the built prospect list to Supabase in batches through a temporary,
// token-protected function (created before and dropped after the import).
// Usage: IMPORT_TOKEN=... node scripts/import-prospects.mjs prospects.json
import { readFileSync } from "node:fs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const token = process.env.IMPORT_TOKEN;
const rows = JSON.parse(readFileSync(process.argv[2], "utf8"));
if (!url || !key || !token) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or IMPORT_TOKEN");

let done = 0;
for (let i = 0; i < rows.length; i += 800) {
  const batch = rows.slice(i, i + 800);
  const res = await fetch(`${url}/rest/v1/rpc/import_prospects`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ p_token: token, p_rows: batch }),
  });
  if (!res.ok) throw new Error(`Batch ${i}: ${res.status} ${await res.text()}`);
  done += Number(await res.json());
  process.stdout.write(`\r${done} / ${rows.length}`);
}
console.log("\ndone");
