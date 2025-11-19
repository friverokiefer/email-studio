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
 * - count considera cantidad de sets de contenido o imágenes del batch
 */
historyRouter.get("/", async (req, res) => {
  try {
    const type = String(req.query.type || "emails_v2").toLowerCase();
    if (type !== "emails_v2") {
      // Hoy solo soportamos emails_v2; el resto devolvemos []
      return res.json([]);
    }

    const batchIds = await listEmailV2BatchIds();

    const rows = await Promise.all(
      batchIds.map(async (batchId) => {
        const batchKey = `emails_v2/${batchId}/batch.json`;
        let count = 0;
        let createdAtMs = 0;

        const exists = await objectExists(batchKey);
        if (exists) {
          try {
            const batch = await readJson<any>(batchKey);

            const sets = Array.isArray(batch?.sets) ? batch.sets : [];
            // Compatibilidad con batches antiguos sin ensuciar la API pública
            const legacyContent = Array.isArray((batch as any)["trios"])
              ? (batch as any)["trios"]
              : [];
            const images = Array.isArray(batch?.images) ? batch.images : [];

            // Prioridad: sets → contenido legacy → imágenes
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
          } catch (err) {
            console.error(`[history:list:GCS] error leyendo ${batchKey}:`, err);
            // Si falla el parse del JSON, seguimos sin romper toda la lista
          }
        }

        if (!createdAtMs) {
          try {
            createdAtMs = await getObjectUpdatedAtMs(batchKey);
          } catch (err) {
            console.error(
              `[history:list:GCS] error getObjectUpdatedAtMs ${batchKey}:`,
              err
            );
          }
        }

        return {
          batchId,
          count,
          createdAt: createdAtMs
            ? new Date(createdAtMs).toISOString()
            : undefined,
        };
      })
    );

    // Limpieza: sacamos filas sin contenido o sin fecha
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
    console.error("[history:list:GCS] error:", e);
    res.status(500).send(e?.message || "ErrorHistoryList");
  }
});
