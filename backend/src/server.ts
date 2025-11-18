// backend/src/server.ts

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

import { CFG } from "./services/gcpStorage";
import { historyRouter } from "./routes/history";
import { emailV2MetaRouter } from "./routes/emailV2Meta";
import { metaEmailV2Router } from "./routes/metaEmailV2";
import {
  generateEmailsV2Router,
  emailsV2Router,
} from "./routes/generateEmailV2";
import { generatedRouter } from "./routes/generated";
import { sfmcRouter } from "./routes/sfmc";

// ======================================================
// 1. Config básica de app
// ======================================================

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// CORS
const allowedOriginsEnv = process.env.CORS_ORIGINS; // ej: "https://frontendvo06-....run.app"
let corsOrigin: any = true;

if (allowedOriginsEnv) {
  const whitelist = allowedOriginsEnv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  corsOrigin = (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return cb(null, true); // curl / pruebas internas
    if (whitelist.includes(origin)) return cb(null, true);
    console.warn("[CORS] origin no permitido:", origin);
    return cb(null, false);
  };
}

app.use(
  cors({
    origin: corsOrigin,
    credentials: false,
  })
);

// ======================================================
// 2. Health checks y debug
// ======================================================

app.get("/", (_req: Request, res: Response) => {
  res.send("email-studio backend: OK");
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.get("/ready", (_req: Request, res: Response) => {
  res.json({ status: "ready" });
});

// Solo para debug puntual (puedes borrarlo más adelante)
app.get("/env-check", (_req: Request, res: Response) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    GCP_PROJECT_ID: process.env.GCP_PROJECT_ID,
    GCP_BUCKET_NAME: process.env.GCP_BUCKET_NAME,
    GCP_PREFIX: process.env.GCP_PREFIX,
    GCP_PUBLIC_READ: process.env.GCP_PUBLIC_READ,
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || null,
    CFG,
  });
});

// ======================================================
// 3. Rutas de API
// ======================================================

// Historial de lotes (sidebar)
app.use("/api/history", historyRouter);

// Catálogo de campañas + clusters (usado por el frontend)
// GET /api/email-v2/meta
app.use("/api/email-v2", emailV2MetaRouter);

// Alias plural (por si en algún momento el front usa /api/emails-v2/meta)
app.use("/api/emails-v2/meta", metaEmailV2Router);

// Generación de emails v2 (texto + imágenes)
// POST /api/generate-emails-v2
// POST /api/generate-emails-v2/render-email-html
app.use("/api/generate-emails-v2", generateEmailsV2Router);

// Guardar edición de sets
// PUT /api/emails-v2/:batchId
app.use("/api/emails-v2", emailsV2Router);

// Acceso a batch.json + redirect de imágenes
// GET /api/generated/emails_v2/:batchId/batch.json
// GET /api/generated/emails_v2/:batchId/*
app.use(generatedRouter);

// Integración con Salesforce Marketing Cloud
// POST /api/sfmc/draft-email
app.use("/api/sfmc", sfmcRouter);

// ======================================================
// 4. Manejo de errores
// ======================================================

// 404
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    path: req.path,
  });
});

// 500 / errores no controlados
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("🔥 Unhandled error in backend:", err);

  const status = err.status || 500;
  res.status(status).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "production"
        ? "Unexpected error"
        : String(err?.message || err),
  });
});

// ======================================================
// 5. Arranque del servidor
// ======================================================

const port = Number(process.env.PORT) || 8080;

app.listen(port, () => {
  console.log(`✅ email-studio backend escuchando en puerto ${port}`);
  console.log(`   NODE_ENV=${process.env.NODE_ENV || "undefined"}`);
});
