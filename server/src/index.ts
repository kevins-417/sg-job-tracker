import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import { api } from "./routes.js";

dotenv.config({ path: "../.env" });
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 4000;

const origins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: "1mb" }));

// Health check — handy for Render/Railway/Fly readiness probes.
app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.use("/api", api);

// ---- Serve the built client in production (single-service deploy) ----
// When you run `npm run build` at the root, the client lands in client/dist.
// In a combined deploy (one service hosting API + static), this serves it.
const clientDist = join(__dirname, "../../client/dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => res.sendFile(join(clientDist, "index.html")));
}

// ---- Central error handler ----
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("[api] error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
  console.log(`[api] allowed CORS origins: ${origins.join(", ")}`);

  // Daily auto-refresh of job matches. Runs any eligible rule on boot (catching
  // up if the server was asleep), then every 24h while it stays awake. On
  // free hosting that sleeps, the boot run is what keeps matches fresh.
  import("./repositories/autoApply.js")
    .then((m) => {
      m.runDueRules().catch((e) => console.error("[auto-refresh] boot run failed", e));
      setInterval(() => {
        m.runDueRules().catch((e) => console.error("[auto-refresh] timer run failed", e));
      }, 24 * 60 * 60 * 1000);
    })
    .catch((e) => console.error("[auto-refresh] init failed", e));
});
