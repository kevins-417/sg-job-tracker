import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pool } from "./pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// schema.sql is a plain text file, so a `tsc` build does not copy it into dist/.
// Look in the compiled location first, then fall back to the source tree. This
// means the migration works whether run via tsx (source) or node (compiled),
// and on hosts that build with `tsc` without copying static files.
function findSchema(): string {
  const candidates = [
    join(__dirname, "schema.sql"),                 // running from dist/db or src/db
    join(__dirname, "../../src/db/schema.sql"),     // compiled dist/db -> src/db
    join(__dirname, "../src/db/schema.sql"),
    join(process.cwd(), "server/src/db/schema.sql"),
    join(process.cwd(), "src/db/schema.sql"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  throw new Error(
    "Could not locate schema.sql. Looked in:\n  " + candidates.join("\n  ")
  );
}

async function migrate() {
  const schemaPath = findSchema();
  const sql = readFileSync(schemaPath, "utf-8");
  console.log(`[migrate] applying schema from ${schemaPath} …`);
  await pool.query(sql);
  console.log("[migrate] done.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
