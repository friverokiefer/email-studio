// backend/src/routes/metaEmailV2.ts
import { Router } from "express";
import {
  getIaEngineMetaCached,
  type IaEngineMeta,
} from "../lib/ia-engine.meta.client";

export const metaEmailV2Router = Router();

/**
 * GET /api/emails-v2/meta
 * GET /api/emails-v2/meta2   (alias opcional)
 * GET /api/emails-v2/        (raíz, mismo catálogo)
 *
 * Alias "plural" del catálogo que viene desde el IA Engine.
 * Estructura:
 * {
 *   campaigns: string[],
 *   clusters: string[],
 *   campaignClusters: Record<string, string[]>
 * }
 *
 * Opcional:
 *   ?refresh=1  → fuerza recarga (ignora caché en memoria)
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
    console.error(
      "🔥 Error obteniendo meta desde IA Engine (plural route):",
      err
    );
    next(err);
  }
}

// Soportamos varias rutas por compatibilidad:
// - /api/emails-v2/meta
// - /api/emails-v2/meta2
// - /api/emails-v2/
metaEmailV2Router.get(["/", "/meta", "/meta2"], handleMeta);
