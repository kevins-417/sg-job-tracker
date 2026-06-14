import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });
dotenv.config(); // also pick up server-local .env if present

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    "\n[db] DATABASE_URL is not set. Copy .env.example to .env and fill it in.\n"
  );
}

// Many managed Postgres providers (Neon, Supabase, Render, Heroku) require SSL.
// Toggle with PGSSL=true. rejectUnauthorized:false is the pragmatic setting for
// providers that use certs not in Node's default trust store.
const ssl =
  process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined;

export const pool = new Pool({ connectionString, ssl });

pool.on("error", (err) => {
  console.error("[db] unexpected pool error", err);
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params as any[]);
}
