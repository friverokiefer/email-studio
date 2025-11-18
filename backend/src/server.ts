import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

// 👉 Importamos SOLO el router de historial para no reventar nada más
import { historyRouter } from "./routes/history";

// ======================================================
// 1. Config básica de app
// ======================================================

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// CORS
// - En dev: origin true (lo que sea)
// - En prod: idealmente restringir a tu dominio de frontend
const allowedOriginsEnv = process.env.CORS_ORIGINS; // ej: "https://frontendvo06-...run.app"
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
// 2. Health checks (para Cloud Run y pruebas locales)
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

// ======================================================
// 3. Rutas de API (v1)
// ======================================================

// Historial de emails v2
// El frontend está llamando: GET /api/history?type=emails_v2
// Así que aquí montamos el router en ese path base.
app.use("/api/history", historyRouter);

// 👉 Más adelante podemos ir sumando:
// import generateEmailV2Router from "./routes/generateEmailV2";
// import metaEmailV2Router from "./routes/emailV2Meta";
// app.use("/api/email-v2", generateEmailV2Router);
// app.use("/api/email-v2/meta", metaEmailV2Router);
// etc.

// ======================================================
// 4. Manejo de errores genérico
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
