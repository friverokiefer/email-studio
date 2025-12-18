// backend/src/server.ts

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

import { historyRouter } from "./routes/history";
import { emailV2MetaRouter } from "./routes/emailV2Meta";
import { metaEmailV2Router } from "./routes/metaEmailV2"; // Router con la lógica de proxy a Python
import {
  generateEmailsV2Router,
  emailsV2Router,
} from "./routes/generateEmailV2";
import { generatedRouter } from "./routes/generated";
import { sfmcRouter } from "./routes/sfmc";
import { emailV2ManualImageRouter } from "./routes/emailV2ManualImage";

import { CFG } from "./services/gcpStorage";

// ======================================================
// 1. Config básica de app
// ======================================================

const app = express();

// Aumentamos el límite del body para recibir imágenes grandes si fuera necesario
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// ===================== CORS ==========================
const allowedOriginsEnv = process.env.CORS_ORIGINS;

const corsOptions = {
  origin: allowedOriginsEnv
    ? allowedOriginsEnv.split(",").map((s) => s.trim())
    : true, 
  credentials: false,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

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

// Historial de lotes
app.use("/api/history", historyRouter);

// NUEVA RUTA: Para que el frontend encuentre las campañas en /api/campaigns
app.use("/api/campaigns", metaEmailV2Router);

// RUTA CRÍTICA: La que usa el hook de React sin el prefijo /api.
app.use("/email-v2/meta", metaEmailV2Router); 

// Catálogo / Meta (Soportando todas las variantes que el hook podría usar):
app.use("/api/email-v2/meta", metaEmailV2Router); 
app.use("/api/emails-v2", metaEmailV2Router); 

// Carga manual de imágenes:
app.use("/api/email-v2", emailV2ManualImageRouter);

// Generación de Email 2.0 (texto + imágenes) y edición:
app.use("/api/generate-emails-v2", generateEmailsV2Router);

// PUT /api/emails-v2/:batchId (guardar sets editados)
app.use("/api/emails-v2", emailsV2Router);

// Enlaces para JSON e imágenes ya generadas:
app.use(generatedRouter);

// Integración con SFMC:
app.use("/api/sfmc", sfmcRouter);

// ======================================================
// 4. Manejo de errores
// ======================================================

// 404 genérico
app.use((req: Request, res: Response) => {
  console.warn(`[404] Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: "Not Found",
    path: req.path,
  });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("🔥 Unhandled error in backend:", err);

  const status = err.status || 500;
  res.status(status).json({
    error: "Internal Server Error",
    message: err?.message || "Unexpected error",
  });
});

// ======================================================
// 5. Arranque del servidor con AJUSTE DE SOCKETS
// ======================================================

const port = Number(process.env.PORT) || 8080;

const server = app.listen(port, () => {
  console.log(`✅ email-studio backend escuchando en puerto ${port}`);
  console.log(`   NODE_ENV=${process.env.NODE_ENV || "undefined"}`);
});

// =================================================================
// 🔧 AJUSTE CRÍTICO DE TIMEOUTS PARA CLOUD RUN Y CARGAS PESADAS
// =================================================================

// 1. Timeout de la Lógica de Aplicación: 15 Minutos (900s)
// Esto permite que tu función espere a la IA sin lanzar error de código.
server.setTimeout(900000); 

// 2. Timeout de Keep-Alive (Infraestructura): 910s
// IMPORTANTE: Debe ser MAYOR que el timeout del Load Balancer (que suele ser el timeout de Cloud Run).
// Si no pones esto, Google corta la conexión silenciosamente aunque server.setTimeout sea alto.
server.keepAliveTimeout = 910000; 

// 3. Timeout de Headers: 920s
// Node.js requiere que headersTimeout sea mayor que keepAliveTimeout.
server.headersTimeout = 920000;

export default app;