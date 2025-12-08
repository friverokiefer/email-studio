// backend/src/routes/metaEmailV2.ts
import { Router, Request, Response, NextFunction } from "express";
import "dotenv/config";

export const metaEmailV2Router = Router();

// Configuración URL base del IA Engine (Python)
const DEFAULT_BASE_URL = "http://127.0.0.1:8000";
const rawBase = process.env.IA_ENGINE_BASE_URL || DEFAULT_BASE_URL;
// Normalizamos para evitar errores de "localhost" en algunos entornos de Node
const IA_ENGINE_URL = rawBase.replace("localhost", "127.0.0.1").replace(/\/+$/, "");

/**
 * GET /api/emails-v2/meta
 * GET /api/emails-v2/meta2
 * * Proxy directo al IA Engine para obtener el catálogo de campañas/clusters.
 * No usamos caché local complicada para evitar desincronización.
 */
async function handleMeta(req: Request, res: Response, next: NextFunction) {
  try {
    const url = `${IA_ENGINE_URL}/ia/meta`;
    console.log(`[MetaProxy] Fetching metadata from: ${url}`);

    // Hacemos el fetch al microservicio de Python
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`IA Engine responded with ${response.status}: ${response.statusText}`);
    }

    // Obtenemos el JSON tal cual lo manda Python
    const data = await response.json();

    // Validación opcional para logging (evitamos error de TS usando 'any' temporalmente en la validación)
    const meta = data as any;
    if (!meta || !meta.campaigns) {
      console.warn("[MetaProxy] Warning: IA Engine returned empty metadata.");
    }

    // Devolvemos exactamente lo que recibimos
    res.json(data);
  } catch (err) {
    console.error("🔥 Error proxying meta request to IA Engine:", err);
    // Pasamos el error al handler global de Express
    next(err);
  }
}

// Rutas soportadas
metaEmailV2Router.get(["/", "/meta", "/meta2"], handleMeta);