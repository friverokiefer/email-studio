// backend/src/routes/export.ts
import { Router } from "express";
import { readJson } from "../services/gcpStorage";

const router = Router();

// 1. Definimos la forma de los datos para que TypeScript no se queje
interface ExportItem {
  campaign: string;
  cluster: string;
  version: number;
  subject: string;
  preheader: string;
  bodyTitle: string;
  bodyContent: string;
  cta: string;
  heroUrl: string;
}

/**
 * Helper: Carga los datos desde GCS y los normaliza.
 * Retorna una promesa con un array de ExportItem tipado.
 */
async function loadBatchItemsFromGCS(batchId: string): Promise<ExportItem[]> {
  const gcsPath = `emails_v2/${batchId}/batch.json`;
  
  const data = await readJson<any>(gcsPath);

  if (!data) return [];

  // Soporte para estructura antigua (trios) y nueva (sets)
  const itemsRaw = Array.isArray(data.sets) 
    ? data.sets 
    : Array.isArray(data.trios) 
      ? data.trios 
      : [];

  const images = Array.isArray(data.images) ? data.images : [];
  
  // Mapeo con tipos explícitos
  return itemsRaw.map((item: any, index: number) => {
    const version = item.id || (index + 1);
    
    // En V2 body es objeto, en legacy era string
    let bodyTitle = "";
    let bodyContent = "";
    
    if (item.body && typeof item.body === "object") {
      bodyTitle = item.body.title || "";
      bodyContent = item.body.content || "";
    } else {
      bodyContent = String(item.body || "");
    }

    // Imagen asociada
    const imgObj = images[index] || {};
    const heroUrl = imgObj.heroUrl || imgObj.url || "";

    return {
      campaign: data.campaign || "",
      cluster: data.cluster || "",
      version,
      subject: item.subject || "",
      preheader: item.preheader || "",
      bodyTitle,
      bodyContent,
      cta: item.cta || "",
      heroUrl
    };
  });
}

/** CSV Escaping */
function safeCsv(v: unknown): string {
  if (v == null) return `""`;
  const s = String(v).replace(/"/g, '""').replace(/\n/g, " ");
  return `"${s}"`;
}

/** HTML Escaping */
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * GET /api/export/csv?batchId=...
 */
router.get("/csv", async (req, res) => {
  try {
    const batchId = String(req.query.batchId || "");
    if (!batchId) return res.status(400).send("batchId requerido");

    // TypeScript ahora sabe que items es ExportItem[]
    const items = await loadBatchItemsFromGCS(batchId);

    if (!items || items.length === 0) {
      return res.status(404).send("Batch no encontrado en GCS o vacío");
    }

    const header = "campaign,cluster,version,subject,preheader,body_title,body_content,cta,heroUrl";
    
    // Aquí 'it' ya no da error porque se infiere de ExportItem
    const rows = items.map((it) => {
      return [
        safeCsv(it.campaign),
        safeCsv(it.cluster),
        it.version,
        safeCsv(it.subject),
        safeCsv(it.preheader),
        safeCsv(it.bodyTitle), 
        safeCsv(it.bodyContent),
        safeCsv(it.cta),
        safeCsv(it.heroUrl),
      ].join(",");
    });

    const csv = ["\uFEFF" + header, ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${batchId}.csv"`);
    res.send(csv);

  } catch (e: any) {
    console.error("[export:csv] error:", e);
    res.status(500).send("Error interno exportando CSV");
  }
});

/**
 * GET /api/export/html?batchId=...&version=1
 */
router.get("/html", async (req, res) => {
  try {
    const batchId = String(req.query.batchId || "");
    const version = Number(req.query.version || 1);
    
    if (!batchId) return res.status(400).send("batchId requerido");

    const items = await loadBatchItemsFromGCS(batchId);
    const item = items.find((it) => it.version === version) || items[0];

    if (!item) {
      return res.status(404).send("Versión no encontrada");
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(item.subject)}</title>
<style>
  body{font-family:sans-serif;background:#f4f4f4;margin:0;padding:20px;}
  .email-container{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);}
  .hero img{width:100%;height:auto;display:block;}
  .content{padding:24px;}
  h1{margin-top:0;color:#333;}
  .preheader{color:#666;font-style:italic;margin-bottom:16px;}
  .body-text{line-height:1.6;color:#444;}
  .cta-btn{display:inline-block;background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;margin-top:20px;}
</style>
</head>
<body>
  <div class="email-container">
    ${item.heroUrl ? `<div class="hero"><img src="${item.heroUrl}" alt="Hero" /></div>` : ""}
    <div class="content">
      <div class="preheader">${escapeHtml(item.preheader)}</div>
      <h1>${escapeHtml(item.subject)}</h1>
      <div class="body-text">
        ${item.bodyTitle ? `<h3>${escapeHtml(item.bodyTitle)}</h3>` : ""}
        <p>${escapeHtml(item.bodyContent)}</p>
      </div>
      ${item.cta ? `<a href="#" class="cta-btn">${escapeHtml(item.cta)}</a>` : ""}
    </div>
  </div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);

  } catch (e: any) {
    console.error("[export:html] error:", e);
    res.status(500).send("Error interno exportando HTML");
  }
});

export default router;