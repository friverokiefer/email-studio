// backend/src/routes/emailV2Meta.ts
import { Router } from "express";
import {
  getIaEngineMetaCached,
  type IaEngineMeta,
} from "../lib/ia-engine.meta.client";

export const emailV2MetaRouter = Router();

/**
 * GET /api/email-v2/meta
 * GET /api/email-v2/meta2   (alias para compatibilidad)
 * GET /api/email-v2         (raíz, mismo catálogo)
 *
 * Endpoint de meta para Email 2.0 consumido por el frontend.
 *
 * Fuente de verdad: IA Engine (/ia/meta).
 * Estructura devuelta:
 * {
 *   campaigns: string[],
 *   clusters: string[],
 *   campaignClusters: Record<string, string[]>
 * }
 *
 * Query opcional:
 *   ?refresh=1  → fuerza recarga (ignora caché de Node)
 */
async function handleMeta(req: any, res: any, next: any) {
  try {
    const refreshParam = String(req.query.refresh || "").toLowerCase();
    const forceRefresh =
      refreshParam === "1" ||
      refreshParam === "true" ||
      refreshParam === "yes";

    const meta: IaEngineMeta = await getIaEngineMetaCached({
      forceRefresh,
    });

    res.json(meta);
  } catch (err) {
    console.error("🔥 Error obteniendo meta Email V2 desde IA Engine:", err);
    next(err);
  }
}

// Rutas soportadas:
// - /api/email-v2/meta
// - /api/email-v2/meta2
// - /api/email-v2
emailV2MetaRouter.get(["/meta", "/meta2", "/"], handleMeta);
