// backend/src/routes/history.ts
import { Router } from "express";
import {
  listEmailV2BatchIds,
  readJson,
  getObjectUpdatedAtMs,
  objectExists,
} from "../services/gcpStorage";

export const historyRouter = Router();

/**
 * GET /api/history?type=emails_v2
 * Respuesta: [{ batchId, count, createdAt }]
 * Lee directamente desde GCS: emails_v2/<batchId>/batch.json
 * * MEJORA LOCAL: Chunking agresivo (50) para velocidad y manejo de errores robusto.
 */
historyRouter.get("/", async (req, res) => {
  try {
    const type = String(req.query.type || "emails_v2").toLowerCase();
    if (type !== "emails_v2") {
      return res.json([]);
    }

    // 1. Obtener lista de carpetas (rápido)
    const batchIds = await listEmailV2BatchIds();

    // === CONFIGURACIÓN DE RENDIMIENTO ===
    // 50 es un buen equilibrio para Docker local.
    // Si notas errores "socket hang up", bájalo a 20.
    const CONCURRENCY_LIMIT = 50;
    const rows: any[] = [];

    // console.time("history-load"); // Descomentar para debuggear tiempos

    for (let i = 0; i < batchIds.length; i += CONCURRENCY_LIMIT) {
      const chunk = batchIds.slice(i, i + CONCURRENCY_LIMIT);
      
      const chunkResults = await Promise.all(
        chunk.map(async (batchId) => {
          const batchKey = `emails_v2/${batchId}/batch.json`;
          let count = 0;
          let createdAtMs = 0;

          try {
            // Verificamos existencia para evitar lecturas fallidas (404)
            const exists = await objectExists(batchKey);
            
            if (exists) {
              const batch = await readJson<any>(batchKey);

              const sets = Array.isArray(batch?.sets) ? batch.sets : [];
              const legacyContent = Array.isArray((batch as any)["trios"])
                ? (batch as any)["trios"]
                : [];
              const images = Array.isArray(batch?.images) ? batch.images : [];

              count =
                (sets.length > 0 ? sets.length : 0) ||
                (legacyContent.length > 0 ? legacyContent.length : 0) ||
                (images.length > 0 ? images.length : 0);

              if (batch?.createdAt) {
                const t = Date.parse(String(batch.createdAt));
                if (!Number.isNaN(t)) {
                  createdAtMs = t;
                }
              }
            }

            // Fallback: si no hay fecha en el JSON, la sacamos de los metadatos del archivo
            if (!createdAtMs) {
              createdAtMs = await getObjectUpdatedAtMs(batchKey);
            }

            return {
              batchId,
              count,
              createdAt: createdAtMs
                ? new Date(createdAtMs).toISOString()
                : undefined,
            };
          } catch (err) {
            // Si falla un archivo específico, lo logueamos pero retornamos null
            // para NO romper la carga del resto del historial.
            console.warn(`[history] Error leyendo batch ${batchId}:`, err);
            return null;
          }
        })
      );
      
      // Filtramos los nulos (errores) y agregamos al resultado final
      rows.push(...chunkResults.filter(r => r !== null));
    }

    // console.timeEnd("history-load");

    // Limpieza y Ordenamiento
    const sanitized = rows.filter(
      (row) => (row.count ?? 0) > 0 && !!row.createdAt
    );

    sanitized.sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
      return tb - ta;
    });

    res.json(sanitized);
  } catch (e: any) {
    console.error("[history:list:GCS] Error CRITICAL:", e);
    res.status(500).send(e?.message || "ErrorHistoryList");
  }
});