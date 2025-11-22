// backend/src/routes/emailV2ManualImage.ts
import { Router } from "express";
import multer from "multer";
import path from "path";
import {
  uploadBuffer,
  uploadJson,
  readJson,
  withPrefix,
} from "../services/gcpStorage";

export const emailV2ManualImageRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB por si acaso
  },
});

/** URL directa (storage.googleapis.com) a un objeto del bucket, con cache-busting opcional */
function gcsDirectUrl(objectKey: string, v?: string) {
  const bucket = process.env.GCP_BUCKET_NAME || "";
  const full = withPrefix(objectKey).replace(/^\/+/, "");
  const encoded = full
    .split("/")
    .map((encodeURIComponent as any))
    .join("/");
  const qs = v ? `?v=${encodeURIComponent(v)}` : "";
  return `https://storage.googleapis.com/${bucket}/${encoded}${qs}`;
}

/**
 * POST /api/email-v2/batch/:batchId/images/manual-upload
 * Body: multipart/form-data con campo "file" (imagen)
 */
emailV2ManualImageRouter.post(
  "/batch/:batchId/images/manual-upload",
  upload.single("file"),
  async (req, res) => {
    try {
      const batchId = String(req.params.batchId || "").trim();
      if (!batchId) {
        return res
          .status(400)
          .json({ ok: false, error: "batchId requerido" });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({
          ok: false,
          error: "Archivo de imagen requerido (campo 'file').",
        });
      }

      const origName = file.originalname || "manual-upload.jpg";
      const ext = (path.extname(origName) || ".jpg").toLowerCase();
      const base = path
        .basename(origName, ext)
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "manual";

      const ts = Date.now();
      const finalName = `manual_${ts}_${base}${ext}`;
      const objectKey = `emails_v2/${batchId}/${finalName}`;

      // Subir a GCS (público si GCP_PUBLIC_READ=true)
      await uploadBuffer(objectKey, file.buffer, file.mimetype || undefined, true);

      const heroUrl = gcsDirectUrl(objectKey, batchId);

      const imagePayload = {
        fileName: finalName,
        heroUrl,
        meta: {
          source: "manual-upload",
          contentType: file.mimetype,
          sizeBytes: file.size,
          uploadedAt: new Date().toISOString(),
        },
      };

      // Intentar actualizar batch.json si existe
      const batchKey = `emails_v2/${batchId}/batch.json`;
      let batch: any | null = null;
      try {
        batch = await readJson<any>(batchKey);
      } catch {
        batch = null;
      }

      if (batch && Array.isArray(batch.images)) {
        batch.images = [...batch.images, imagePayload];
        batch.updatedAt = new Date().toISOString();
        await uploadJson(batchKey, batch);
      }

      return res.json({
        ok: true,
        batchId,
        image: imagePayload,
      });
    } catch (e: any) {
      console.error("[emailV2ManualImage] error:", e);
      return res.status(500).json({
        ok: false,
        error: e?.message || "Error subiendo imagen manual",
      });
    }
  }
);
