import { randomUUID } from "node:crypto";
import { query } from "../db/pool.js";
import { rowToCompany, rowToResume } from "../db/mappers.js";
import type { Company, Resume } from "../types.js";
import type { CompanyInput } from "../validators.js";

export async function listCompanies(userId: string): Promise<Company[]> {
  const { rows } = await query("SELECT * FROM companies WHERE (user_id = $1 OR user_id = '') ORDER BY name ASC", [userId]);
  return rows.map(rowToCompany);
}

export async function upsertCompany(input: CompanyInput, userId: string): Promise<Company> {
  const id = input.id || randomUUID();
  const { rows } = await query(
    `INSERT INTO companies (id, name, industry, website, glassdoor, hq, sg_office, employees, notes, user_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (id) DO UPDATE SET
       name=EXCLUDED.name, industry=EXCLUDED.industry, website=EXCLUDED.website,
       glassdoor=EXCLUDED.glassdoor, hq=EXCLUDED.hq, sg_office=EXCLUDED.sg_office,
       employees=EXCLUDED.employees, notes=EXCLUDED.notes
     RETURNING *`,
    [id, input.name, input.industry, input.website, input.glassdoor, input.hq,
     input.sgOffice, input.employees, input.notes, userId]
  );
  return rowToCompany(rows[0]);
}

export async function deleteCompany(id: string, userId: string): Promise<boolean> {
  const { rowCount } = await query("DELETE FROM companies WHERE id = $1 AND (user_id = $2 OR user_id = '')", [id, userId]);
  return (rowCount ?? 0) > 0;
}

// Resumes are shared sample data in this mock-up; scope them per-user too so
// each user could maintain their own set later. Legacy ('') resumes stay visible.
export async function listResumes(userId: string): Promise<Resume[]> {
  const { rows } = await query("SELECT * FROM resumes WHERE (user_id = $1 OR user_id = '') ORDER BY name ASC", [userId]);
  return rows.map(rowToResume);
}
