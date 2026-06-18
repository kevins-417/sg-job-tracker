import { randomUUID as uid } from "node:crypto";
import { pool, query } from "./pool.js";

const today = new Date().toISOString().slice(0, 10);

const companies = [
  { id: uid(), name: "Grab", industry: "Technology", website: "https://grab.com", glassdoor: "", hq: "Singapore", sg_office: "One-North", employees: "8000+", notes: "Strong PM culture. Tough system-design rounds." },
  { id: uid(), name: "DBS Bank", industry: "Finance & Banking", website: "https://dbs.com", glassdoor: "", hq: "Singapore", sg_office: "Marina Bay", employees: "30000+", notes: "Digital transformation focus." },
  { id: uid(), name: "GovTech", industry: "Government", website: "https://tech.gov.sg", glassdoor: "", hq: "Singapore", sg_office: "Pasir Panjang", employees: "3500+", notes: "Public-sector digital services." },
];

const resumes = [
  { id: "r1", name: "PM_General_v3", version: "3.0", target_industry: "Technology" },
  { id: "r2", name: "PM_Fintech_v2", version: "2.0", target_industry: "Finance & Banking" },
  { id: "r3", name: "PM_GovDigital_v1", version: "1.0", target_industry: "Government" },
];

const applications = [
  {
    id: uid(), date_applied: "2026-05-20", company: "Grab", title: "Senior Product Manager",
    job_function: "Product", industry: "Technology", portal: "LinkedIn Jobs",
    recruiter_name: "Wei Ling Tan", recruiter_email: "weiling.t@grab.com", recruiter_phone: "",
    salary_min: 9000, salary_max: 12000, location: "One-North", employment_type: "Full-time",
    status: "Technical Interview", job_description: "", resume_id: "r1", next_action_date: "2026-06-18",
    timeline: [
      { id: uid(), date: "2026-05-20", label: "Applied via LinkedIn" },
      { id: uid(), date: "2026-05-24", label: "Recruiter screen scheduled" },
      { id: uid(), date: "2026-06-02", label: "Passed HR interview" },
    ],
    interviews: [{ id: uid(), date: "2026-06-18", time: "10:00", type: "Technical", interviewer: "Eng Panel", link: "https://meet.google.com/abc", notes: "System design round", outcome: "Pending" }],
  },
  {
    id: uid(), date_applied: "2026-05-28", company: "DBS Bank", title: "VP, Data Analytics",
    job_function: "Data", industry: "Finance & Banking", portal: "MyCareersFuture",
    recruiter_name: "Marcus Lee", recruiter_email: "marcuslee@dbs.com", recruiter_phone: "",
    salary_min: 10000, salary_max: 14000, location: "Marina Bay", employment_type: "Full-time",
    status: "Shortlisted", job_description: "", resume_id: "r2", next_action_date: "2026-06-16",
    timeline: [
      { id: uid(), date: "2026-05-28", label: "Applied via MyCareersFuture" },
      { id: uid(), date: "2026-06-08", label: "Shortlisted" },
    ],
    interviews: [],
  },
  {
    id: uid(), date_applied: "2026-04-15", company: "Shopee", title: "Product Manager",
    job_function: "Product", industry: "Technology", portal: "Glints Singapore",
    recruiter_name: "", recruiter_email: "", recruiter_phone: "",
    salary_min: 7000, salary_max: 9500, location: "Science Park", employment_type: "Full-time",
    status: "Rejected", job_description: "", resume_id: "r1", next_action_date: "",
    timeline: [
      { id: uid(), date: "2026-04-15", label: "Applied" },
      { id: uid(), date: "2026-05-01", label: "Rejected after screen" },
    ],
    interviews: [],
  },
  {
    id: uid(), date_applied: "2026-06-01", company: "GovTech", title: "Lead Product Manager",
    job_function: "Product", industry: "Government", portal: "MyCareersFuture",
    recruiter_name: "Siti Rahman", recruiter_email: "", recruiter_phone: "",
    salary_min: 8500, salary_max: 11000, location: "Pasir Panjang", employment_type: "Full-time",
    status: "Offer Received", job_description: "", resume_id: "r3", next_action_date: "2026-06-20",
    timeline: [
      { id: uid(), date: "2026-06-01", label: "Applied" },
      { id: uid(), date: "2026-06-05", label: "All interview rounds cleared" },
      { id: uid(), date: "2026-06-12", label: "Offer received" },
    ],
    interviews: [],
  },
  {
    id: uid(), date_applied: "2026-06-05", company: "Sea Limited", title: "Group PM",
    job_function: "Product", industry: "Technology", portal: "Indeed Singapore",
    recruiter_name: "", recruiter_email: "", recruiter_phone: "",
    salary_min: 8000, salary_max: 10500, location: "Harbourfront", employment_type: "Full-time",
    status: "Applied", job_description: "", resume_id: "r1", next_action_date: "2026-06-19",
    timeline: [{ id: uid(), date: "2026-06-05", label: "Applied via Indeed" }],
    interviews: [],
  },
  {
    id: uid(), date_applied: "2026-05-10", company: "Singtel", title: "Product Owner",
    job_function: "Product", industry: "Technology", portal: "JobStreet Singapore",
    recruiter_name: "", recruiter_email: "", recruiter_phone: "",
    salary_min: 6000, salary_max: 8000, location: "Orchard", employment_type: "Full-time",
    status: "Withdrawn", job_description: "", resume_id: "r1", next_action_date: "",
    timeline: [
      { id: uid(), date: "2026-05-10", label: "Applied" },
      { id: uid(), date: "2026-05-22", label: "Withdrew — accepted other process" },
    ],
    interviews: [],
  },
];

async function seed() {
  console.log("[seed] clearing existing rows…");
  await query("TRUNCATE applications, companies, resumes, auto_apply_rules, auto_apply_attempts, search_profiles, seen_jobs, users RESTART IDENTITY CASCADE");

  console.log("[seed] creating demo users…");
  const kevinId = uid();
  const priyaId = uid();
  await query("INSERT INTO users (id, name, headline) VALUES ($1,$2,$3)", [kevinId, "Kevin", "Senior Product Manager"]);
  await query("INSERT INTO users (id, name, headline) VALUES ($1,$2,$3)", [priyaId, "Priya", "Product Lead, Fintech"]);
  // Sample data below belongs to Kevin so the demo shows a populated account;
  // Priya starts empty to demonstrate per-user separation.

  console.log("[seed] inserting companies…");
  for (const c of companies) {
    await query(
      `INSERT INTO companies (id,name,industry,website,glassdoor,hq,sg_office,employees,notes,user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [c.id, c.name, c.industry, c.website, c.glassdoor, c.hq, c.sg_office, c.employees, c.notes, kevinId]
    );
  }

  console.log("[seed] inserting resumes…");
  for (const r of resumes) {
    await query(
      `INSERT INTO resumes (id,name,version,target_industry,user_id) VALUES ($1,$2,$3,$4,$5)`,
      [r.id, r.name, r.version, r.target_industry, kevinId]
    );
  }

  console.log("[seed] inserting applications…");
  for (const a of applications) {
    await query(
      `INSERT INTO applications (
        id,date_applied,company,title,job_function,industry,portal,
        recruiter_name,recruiter_email,recruiter_phone,salary_min,salary_max,
        location,employment_type,status,job_description,resume_id,
        next_action_date,timeline,interviews,user_id
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
        NULLIF($18,'')::date,$19::jsonb,$20::jsonb,$21
      )`,
      [
        a.id, a.date_applied, a.company, a.title, a.job_function, a.industry, a.portal,
        a.recruiter_name, a.recruiter_email, a.recruiter_phone, a.salary_min, a.salary_max,
        a.location, a.employment_type, a.status, a.job_description, a.resume_id,
        a.next_action_date, JSON.stringify(a.timeline), JSON.stringify(a.interviews), kevinId,
      ]
    );
  }

  console.log("[seed] inserting search profile + auto-apply rule (disabled example)…");
  const profileId = uid();
  await query(
    `INSERT INTO search_profiles (id, name, description, user_id) VALUES ($1,$2,$3,$4)`,
    [profileId, "Senior PM — Default", "Senior product roles across tech, finance and government.", kevinId]
  );
  await query(
    `INSERT INTO auto_apply_rules
      (id, label, enabled, keywords, industries, portals, min_salary, resume_id,
       mode, require_review, titles, skills, locations, arrangements,
       min_experience, cover_template, profile_id, auto_refresh,
       company_sizes, freshness, seniority, include_keywords, exclude_keywords,
       must_have_skills, user_id)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10,
             $11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,$15,$16,$17,$18,
             $19::jsonb,$20,$21::jsonb,$22,$23,$24::jsonb,$25)`,
    [
      uid(), "Senior PM roles (review first)", false, "product manager, product owner",
      JSON.stringify(["Technology", "Finance & Banking", "Government"]),
      JSON.stringify(["LinkedIn Jobs", "MyCareersFuture"]),
      7000, "r1", "draft", true,
      JSON.stringify(["Product Manager", "Product Owner"]),
      JSON.stringify(["product strategy", "roadmap", "stakeholder management", "agile"]),
      JSON.stringify(["One-North", "Marina Bay", "Pasir Panjang"]),
      JSON.stringify(["hybrid", "remote"]),
      5, "Warm but concise; lead with product outcomes and metrics.",
      profileId, true,
      JSON.stringify(["large", "mid", "startup"]), "month",
      JSON.stringify(["senior", "lead"]), "", "intern, junior",
      JSON.stringify(["product strategy"]), kevinId,
    ]
  );

  console.log(`[seed] done. ${companies.length} companies, ${resumes.length} resumes, ${applications.length} applications.`);
  await pool.end();
}

seed().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
