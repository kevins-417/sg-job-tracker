import { randomUUID } from "node:crypto";
import { query } from "../db/pool.js";
import { rowToApplication } from "../db/mappers.js";
import type { Application } from "../types.js";
import type { ApplicationInput } from "../validators.js";

const SELECT = "SELECT * FROM applications";

export async function listApplications(): Promise<Application[]> {
  const { rows } = await query(`${SELECT} ORDER BY date_applied DESC, created_at DESC`);
  return rows.map(rowToApplication);
}

export async function getApplication(id: string): Promise<Application | null> {
  const { rows } = await query(`${SELECT} WHERE id = $1`, [id]);
  return rows[0] ? rowToApplication(rows[0]) : null;
}

export async function createApplication(input: ApplicationInput): Promise<Application> {
  const id = input.id || randomUUID();
  const { rows } = await query(
    `INSERT INTO applications (
      id, date_applied, company, title, job_function, industry, portal,
      recruiter_name, recruiter_email, recruiter_phone, salary_min, salary_max,
      location, employment_type, status, job_description, resume_id,
      next_action_date, timeline, interviews
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
      NULLIF($18,'')::date,$19::jsonb,$20::jsonb
    )
    RETURNING *`,
    [
      id, input.dateApplied, input.company, input.title, input.jobFunction,
      input.industry, input.portal, input.recruiterName, input.recruiterEmail,
      input.recruiterPhone, input.salaryMin, input.salaryMax, input.location,
      input.employmentType, input.status, input.jobDescription, input.resumeId,
      input.nextActionDate, JSON.stringify(input.timeline), JSON.stringify(input.interviews),
    ]
  );
  return rowToApplication(rows[0]);
}

export async function updateApplication(
  id: string,
  input: ApplicationInput
): Promise<Application | null> {
  const { rows } = await query(
    `UPDATE applications SET
      date_applied=$2, company=$3, title=$4, job_function=$5, industry=$6,
      portal=$7, recruiter_name=$8, recruiter_email=$9, recruiter_phone=$10,
      salary_min=$11, salary_max=$12, location=$13, employment_type=$14,
      status=$15, job_description=$16, resume_id=$17,
      next_action_date=NULLIF($18,'')::date, timeline=$19::jsonb,
      interviews=$20::jsonb, updated_at=now()
    WHERE id=$1
    RETURNING *`,
    [
      id, input.dateApplied, input.company, input.title, input.jobFunction,
      input.industry, input.portal, input.recruiterName, input.recruiterEmail,
      input.recruiterPhone, input.salaryMin, input.salaryMax, input.location,
      input.employmentType, input.status, input.jobDescription, input.resumeId,
      input.nextActionDate, JSON.stringify(input.timeline), JSON.stringify(input.interviews),
    ]
  );
  return rows[0] ? rowToApplication(rows[0]) : null;
}

export async function deleteApplication(id: string): Promise<boolean> {
  // Free any auto-apply "seen" record tied to this application so the job can
  // be surfaced again on a future refresh.
  try {
    const mod = await import("./autoApply.js");
    await mod.forgetSeenByApplication(id);
  } catch (e) {
    // autoApply table may not exist in minimal setups; ignore.
  }
  const { rowCount } = await query("DELETE FROM applications WHERE id = $1", [id]);
  return (rowCount ?? 0) > 0;
}
