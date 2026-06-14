import { randomUUID } from "node:crypto";
import { query } from "../db/pool.js";
import { rowToCompany, rowToResume } from "../db/mappers.js";
import type { Company, Resume } from "../types.js";
import type { CompanyInput } from "../validators.js";

export async function listCompanies(): Promise<Company[]> {
  const { rows } = await query("SELECT * FROM companies ORDER BY name ASC");
  return rows.map(rowToCompany);
}

export async function upsertCompany(input: CompanyInput): Promise<Company> {
  const id = input.id || randomUUID();
  const { rows } = await query(
    `INSERT INTO companies (id, name, industry, website, glassdoor, hq, sg_office, employees, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (id) DO UPDATE SET
       name=EXCLUDED.name, industry=EXCLUDED.industry, website=EXCLUDED.website,
       glassdoor=EXCLUDED.glassdoor, hq=EXCLUDED.hq, sg_office=EXCLUDED.sg_office,
       employees=EXCLUDED.employees, notes=EXCLUDED.notes
     RETURNING *`,
    [id, input.name, input.industry, input.website, input.glassdoor, input.hq,
     input.sgOffice, input.employees, input.notes]
  );
  return rowToCompany(rows[0]);
}

export async function deleteCompany(id: string): Promise<boolean> {
  const { rowCount } = await query("DELETE FROM companies WHERE id = $1", [id]);
  return (rowCount ?? 0) > 0;
}

export async function listResumes(): Promise<Resume[]> {
  const { rows } = await query("SELECT * FROM resumes ORDER BY name ASC");
  return rows.map(rowToResume);
}
