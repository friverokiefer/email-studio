// backend/src/server.ts

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

import { historyRouter } from "./routes/history";
import { emailV2MetaRouter } from "./routes/emailV2Meta";
import { metaEmailV2Router } from "./routes/metaEmailV2";
import {
  generateEmailsV2Router,
  emailsV2Router,
} from "./routes/generateEmailV2";
import { generatedRouter } from "./routes/generated";
import { sfmcRouter } from "./routes/sfmc";

import { CFG } from "./services/gcpStorage";

// ======================================================
// 1. Config básica de app
// ======================================================

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// CORS
// CORS_ORIGINS puede ser:
// - undefined  → permite cualquier origen (true)
// - "https://front.run.app"  → un solo origen
// - "https://front.run.app,https://otro.run.app" → varios
const allowedOriginsEnv = process.env.CORS_ORIGINS;
const allowedOrigins = allowedOriginsEnv
  ? allowedOriginsEnv.split(",").map((s) => s.trim())
  : true;

app.use(
  cors({
    origin: allowedOrigins,
    credentials: false,
  })
);

// ======================================================
// 2. Health checks
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

// Debug de entorno (solo para pruebas; en producción puedes quitarlo o protegerlo)
app.get("/env-check", (_req: Request, res: Response) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    GCP_PROJECT_ID: process.env.GCP_PROJECT_ID,
    GCP_BUCKET_NAME: process.env.GCP_BUCKET_NAME,
    GCP_PREFIX: process.env.GCP_PREFIX,
    GCP_PUBLIC_READ: process.env.GCP_PUBLIC_READ,
    GOOGLE_APPLICATION_CREDENTIALS:
      process.env.GOOGLE_APPLICATION_CREDENTIALS || null,
    CFG,
  });
});

// ======================================================
// 3. Rutas de API
// ======================================================

// Historial de lotes (lee directo desde GCS: emails_v2/<batchId>/batch.json)
app.use("/api/history", historyRouter);

// Meta Email 2.0 (campañas / clusters) – ruta principal usada por el frontend:
// GET /api/email-v2/meta
app.use("/api/email-v2", emailV2MetaRouter);

// Alias plural para compatibilidad futura:
// GET /api/emails-v2/meta
app.use("/api/emails-v2/meta", metaEmailV2Router);

// Generación de Email 2.0 (texto + imágenes) y edición:
// POST /api/generate-emails-v2
// POST /api/generate-emails-v2/render-email-html
app.use("/api/generate-emails-v2", generateEmailsV2Router);

// PUT /api/emails-v2/:batchId  (guardar sets editados)
app.use("/api/emails-v2", emailsV2Router);

// Enlaces para JSON e imágenes ya generadas:
// - GET /api/generated/emails_v2/:batchId/batch.json
// - GET /generated/emails_v2/:batchId/batch.json
// - GET /api/generated/emails_v2/:batchId/*
// - GET /generated/emails_v2/:batchId/*
app.use(generatedRouter);

// Integración con SFMC (borradores de email):
// POST /api/sfmc/draft-email
app.use("/api/sfmc", sfmcRouter);

// ======================================================
// 4. Manejo de errores
// ======================================================

// 404 genérico
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    path: req.path,
  });
});

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
