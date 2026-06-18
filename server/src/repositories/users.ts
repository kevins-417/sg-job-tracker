import { randomUUID } from "node:crypto";
import { query } from "../db/pool.js";
import { rowToUser } from "../db/mappers.js";
import type { User } from "../types.js";

export async function listUsers(): Promise<User[]> {
  const { rows } = await query("SELECT * FROM users ORDER BY created_at ASC");
  return rows.map(rowToUser);
}

export async function createUser(name: string, headline: string): Promise<User> {
  const id = randomUUID();
  const { rows } = await query(
    "INSERT INTO users (id, name, headline) VALUES ($1,$2,$3) RETURNING *",
    [id, name, headline]
  );
  return rowToUser(rows[0]);
}

export async function getUser(id: string): Promise<User | null> {
  const { rows } = await query("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0] ? rowToUser(rows[0]) : null;
}

export async function deleteUser(id: string): Promise<boolean> {
  // Remove all of this user's data, then the user. (Mock-up: hard delete.)
  await query("DELETE FROM applications WHERE user_id = $1", [id]);
  await query("DELETE FROM companies WHERE user_id = $1", [id]);
  await query("DELETE FROM resumes WHERE user_id = $1", [id]);
  await query("DELETE FROM auto_apply_attempts WHERE user_id = $1", [id]);
  await query("DELETE FROM auto_apply_rules WHERE user_id = $1", [id]);
  await query("DELETE FROM search_profiles WHERE user_id = $1", [id]);
  await query("DELETE FROM seen_jobs WHERE user_id = $1", [id]);
  const { rowCount } = await query("DELETE FROM users WHERE id = $1", [id]);
  return (rowCount ?? 0) > 0;
}
