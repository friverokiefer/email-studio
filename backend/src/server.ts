// backend/src/server.ts

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

// ======================================================
// 1. Config básica de app
// ======================================================

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// CORS básico: para pruebas dejamos origin: true
app.use(
  cors({
    origin: true, // luego restringimos al dominio del frontend
    credentials: false,
  })
);

// ======================================================
// 2. Health checks (para Cloud Run y pruebas locales)
// ======================================================

app.get("/", (_req: Request, res: Response) => {
  res.send("email-studio backend: OK (minimal server)");
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.get("/ready", (_req: Request, res: Response) => {
  res.json({ status: "ready" });
});

// ======================================================
// 3. Manejo de errores genérico
// ======================================================

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
// 4. Arranque del servidor
// ======================================================

const port = Number(process.env.PORT) || 8080;

app.listen(port, () => {
  console.log(`✅ email-studio backend escuchando en puerto ${port}`);
  console.log(`   NODE_ENV=${process.env.NODE_ENV || "undefined"}`);
});
