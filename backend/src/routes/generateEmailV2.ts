// backend/src/routes/generateEmailV2.ts
import "dotenv/config";
import { Router } from "express";
import path from "path";
import fs from "fs/promises";

import { isValidCampaign, isValidCluster } from "../utils/validate";
import { generateHeroPNG } from "../services/image";
import { extractOpenAIError } from "../services/openai";
import {
  uploadJson,
  uploadBuffer,
  withPrefix,
  ensureReadUrl,
  cloudBrowserUrl,
} from "../services/gcpStorage";
import { renderEmailHTML } from "../services/emailTemplate";
import {
  generateEmailSetsViaIAEngine,
  IA_ENGINE_ENABLED,
} from "../services/iaEngine";

// [MEJORA] Importamos el servicio de índice (se creará en Parte B)
import { addToHistoryIndex } from "../services/historyIndex";

/* =========================
 * Tipos respuesta
 * ========================= */
export type EmailContentSet = {
  id: number;
  subject: string;
  preheader: string;
  body: { title: string; subtitle?: string | null; content: string };
  cta?: string;
};

// Tipado alineado con la respuesta estricta de image.ts
export type EmailV2Image = {
  fileName: string;
  heroUrl: string; // URL directa (storage.googleapis.com + cache-busting)
  meta?: {
    model?: string;
    size?: string; // valor solicitado al modelo
    quality?: string;
    width?: number; // dimensión real del JPG final
    height?: number; // dimensión real del JPG final
    sizeNormalized?: string; // p.ej. "1792x1024"
    fallback?: boolean;
    // prompt?: string; // Opcional en la respuesta pública
  };
};

type EmailV2Feedback = {
  subject?: string;
  preheader?: string;
  bodyContent?: string; // canonical
  body?: string; // compat
};

/* =========================
 * Utils
 * ========================= */
function makeBatchId(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(
    d.getHours()
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

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

/* =========================
 * Sanitización “email-safe”
 * ========================= */
const SPAM_TRIGGERS = [
  /\bgratis\b/i,
  /\bregalo\b/i,
  /\burgente\b/i,
  /\b100%\s*gratis\b/i,
  /\bgana dinero\b/i,
  /💰|🎁|🔥|🎉|✅|⭐️/,
];

function stripEmojis(s: string) {
  return s.replace(
    /([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF]|[\u2011-\u26FF])/g,
    ""
  );
}
function sentenceCase(s: string) {
  const t = s.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function clampChars(s: string, _min: number, max: number) {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length > max) return t.slice(0, max - 1).trimEnd() + "…";
  return t;
}

function sanitizeCopy(raw: {
  subject: string;
  preheader: string;
  body: string;
  cta?: string;
}) {
  let { subject, preheader, body, cta } = raw;

  subject = stripEmojis(subject)
    .replace(/[!¡]{2,}/g, "!")
    .replace(/\s+/g, " ")
    .trim();
  preheader = stripEmojis(preheader).replace(/\s+/g, " ").trim();
  body = stripEmojis(body).trim();

  subject = sentenceCase(subject.replace(/\.+$/g, ""));
  preheader = sentenceCase(preheader);

  subject = clampChars(subject, 38, 60);
  preheader = clampChars(preheader, 60, 110);

  for (const rx of SPAM_TRIGGERS) {
    subject = subject.replace(rx, "").replace(/\s{2,}/g, " ").trim();
    preheader = preheader.replace(rx, "").replace(/\s{2,}/g, " ").trim();
  }

  if (cta) {
    cta = stripEmojis(cta).replace(/\s{2,}/g, " ").trim();
    if (cta.length > 24) cta = cta.split(/\s+/).slice(0, 3).join(" ");
  }

  if (!/Sujeto a evaluación/i.test(body)) {
    body += `\nSujeto a evaluación. Condiciones referenciales.`;
  }

  return { subject, preheader, body, cta };
}

/** Título y bajada del cuerpo: sin emojis, sentence-case, clamp prudente */
function sanitizeHeading(candidate: any, fallback: string): string {
  let s = String(candidate ?? "").trim();
  s = stripEmojis(s).replace(/\s+/g, " ").trim();
  if (!s) s = fallback || "";
  s = sentenceCase(s);
  s = clampChars(s, 0, 60);
  return s;
}
function sanitizeSubheading(
  candidate: any,
  fallback?: string | null
): string | null {
  let s = String(candidate ?? "").trim();
  s = stripEmojis(s).replace(/\s+/g, " ").trim();
  if (!s) s = String(fallback || "").trim();
  if (!s) return null;
  s = sentenceCase(s);
  s = clampChars(s, 0, 120);
  return s;
}

/** Normaliza el array de sets de contenido */
function sanitizeContentSets(input: any[]): EmailContentSet[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((t, i) => {
      const rawId = (t && (t.id as any)) ?? i + 1;
      let idNum = Number(rawId);
      if (Number.isNaN(idNum)) {
        const m = String(rawId).match(/(\d+)/);
        idNum = m ? Number(m[1]) : i + 1;
      }
      return {
        id: idNum,
        subject: String(t?.subject ?? "").trim(),
        preheader: String(t?.preheader ?? "").trim(),
        body: {
          title: String(t?.body?.title ?? "").trim(),
          subtitle:
            t?.body?.subtitle == null || t?.body?.subtitle === ""
              ? null
              : String(t?.body?.subtitle),
          content: String(t?.body?.content ?? "").trim(),
        },
        cta: t?.cta ? String(t.cta) : undefined,
      } as EmailContentSet;
    })
    .filter((t) => t.subject || t.preheader || t.body?.content);
}

/** Helper robusto para leer JSON existente desde GCS */
async function readJsonFromBucket<T = any>(objectKey: string): Promise<T> {
  // 1) Intento con URL firmada (rápido)
  try {
    const signed = await ensureReadUrl(objectKey, 20);
    const res = await fetch(signed);
    if (res.ok) return (await res.json()) as T;
    throw new Error(`HTTP ${res.status}`);
  } catch (e1) {
    // 2) Fallback a URL pública directa (si el objeto es público)
    try {
      const direct = gcsDirectUrl(objectKey);
      const res2 = await fetch(direct);
      if (res2.ok) return (await res2.json()) as T;
      throw new Error(`HTTP ${res2.status}`);
    } catch (e2) {
      throw e1;
    }
  }
}

/* =========================
 * Routers
 * ========================= */
export const generateEmailsV2Router = Router();
export const emailsV2Router = Router(); // PUT /api/emails-v2/:batchId

/* ========= POST /api/generate-emails-v2 ========= */
generateEmailsV2Router.post("/", async (req, res) => {
  // Timeout del request completo (Express). Evita colgues largos.
  // @ts-ignore
  req.setTimeout?.(180_000);

  let aborted = false;
  req.on?.("aborted", () => {
    aborted = true;
    console.warn("[emails_v2] request aborted by client");
  });

  try {
    // 1. Extraer todos los parámetros incluyendo temperature y imageQuality
    const { campaign, cluster, sets, images, feedback, temperature, imageQuality } = req.body || {};
    
    const setCount = Math.max(1, Math.min(5, Number(sets) || 1));
    const imageCount = Math.max(1, Math.min(5, Number(images) || 2));

    // Validar / Normalizar Temperature
    let safeTemp: number | undefined = undefined;
    if (typeof temperature === 'number') {
        // Limitamos entre 0 y 1.2 para evitar alucinaciones excesivas
        safeTemp = Math.max(0, Math.min(1.2, temperature)); 
    }

    console.log("[emails_v2] incoming:", {
      campaign,
      cluster,
      setCount,
      imageCount,
      temperature: safeTemp,
      imageQuality, // <--- Log para debug
      hasFeedback: !!feedback,
      iaEngineEnabled: IA_ENGINE_ENABLED,
    });

    if (!isValidCampaign(campaign)) {
      return res.status(400).json({
        ok: false,
        error: "campaign inválido",
        details: {
          received: String(campaign || ""),
          source: "backend/src/utils/constants.ts::CAMPAIGNS",
        },
      });
    }
    if (!isValidCluster(cluster)) {
      return res.status(400).json({
        ok: false,
        error: "cluster inválido",
        details: {
          received: String(cluster || ""),
          source: "backend/src/utils/constants.ts::CLUSTERS",
        },
      });
    }

    const batchId = makeBatchId();
    const createdAt = new Date().toISOString();

    const normalizedFeedback: EmailV2Feedback | undefined = feedback
      ? {
          subject:
            typeof feedback.subject === "string"
              ? feedback.subject
              : undefined,
          preheader:
            typeof feedback.preheader === "string"
              ? feedback.preheader
              : undefined,
          bodyContent:
            typeof feedback.bodyContent === "string"
              ? feedback.bodyContent
              : typeof feedback.body === "string"
              ? feedback.body
              : undefined,
        }
      : undefined;

    /* 1) IMÁGENES (normalizadas COVER 16:9, gpt-image-1, High Quality) */
    const imagesOut: EmailV2Image[] = [];
    const debugImagePrompts: any[] = []; // <--- NUEVO: Acumulador de prompts de imagen

    // IMPORTANTE: tmp ahora es backend/tmp/generated/<batchId>
    const tmpOutDir = path.resolve(process.cwd(), "tmp", "generated", batchId);
    await fs.mkdir(tmpOutDir, { recursive: true });

    for (let i = 0; i < imageCount; i++) {
      const t0 = Date.now();
      console.log(`[emails_v2] generating image ${i + 1}/${imageCount}…`);
      
      // Llamada al nuevo servicio estricto
      const img = await generateHeroPNG({
        campaign,
        cluster,
        outDir: tmpOutDir,
        versionIndex: i,
        promptHint: normalizedFeedback?.bodyContent || undefined,
        mode: "cover",
        quality: imageQuality, // <--- PASAMOS LA CALIDAD
      });
      
      const t1 = Date.now();
      console.log(
        `[emails_v2] image ${i + 1}/${imageCount} ready in ${t1 - t0}ms`,
        {
          fileName: img.fileName,
          meta: img.meta,
        }
      );

      // <--- NUEVO: Guardamos el prompt para el JSON debug
      debugImagePrompts.push({
          fileName: img.fileName,
          prompt: img.meta.prompt, // Capturado del servicio (modificado en Parte 1)
          model: img.meta.model
      });

      if (aborted) {
        console.warn("[emails_v2] abort detected after image gen — stopping early");
        return;
      }

      const localFile = path.join(tmpOutDir, img.fileName);
      const buf = await fs.readFile(localFile);
      const key = `emails_v2/${batchId}/${img.fileName}`;
      await uploadBuffer(key, buf, "image/jpeg", true);

      const heroDirect = gcsDirectUrl(key, batchId); // cache-busting
      
      imagesOut.push({
        fileName: img.fileName,
        heroUrl: heroDirect,
        meta: {
          model: img.meta.model,
          size: img.meta.size,
          quality: img.meta.quality,
          width: img.meta.width,
          height: img.meta.height,
          sizeNormalized: img.meta.sizeNormalized,
          fallback: img.meta.fallback
        },
      });
    }

    console.log("[emails_v2] images done", {
      batchId,
      images: imagesOut.map((x) => ({
        fileName: x.fileName,
        size: x.meta?.size,
        quality: x.meta?.quality,
        sizeNormalized: x.meta?.sizeNormalized,
      })),
    });

    /* 2) SETS DE CONTENIDO (inyectando hero directo como contexto opcional) */
    let contentSets: EmailContentSet[] = [];
    let iaEngineError: unknown | null = null;
    let debugTextPrompts: any[] = []; // <--- NUEVO: Acumulador de prompts de texto

    const feedbackWithHero: EmailV2Feedback | undefined = (() => {
      const line = `Hero image URL (usar tal cual): ${
        imagesOut[0]?.heroUrl || ""
      }`;
      if (!normalizedFeedback) return { bodyContent: line };
      const baseBody = normalizedFeedback.bodyContent?.trim() || "";
      const mergedBody = baseBody.length > 0 ? `${baseBody}\n${line}` : line;
      return { ...normalizedFeedback, bodyContent: mergedBody };
    })();

    // 2.1 Intentar primero el motor externo Python (IA Engine)
    if (IA_ENGINE_ENABLED) {
      try {
        console.log("[emails_v2] usando IA Engine externo (Python) para textos…");

        // <--- CAMBIO: Pasamos temperature al servicio
        const { sets: iaSets, metadata: iaMetadata } = await generateEmailSetsViaIAEngine({
          campaign,
          cluster,
          setCount,
          temperature: safeTemp, 
          feedback: feedbackWithHero,
        });

        // <--- NUEVO: Extraemos los prompts de texto de la metadata
        if (iaMetadata && Array.isArray(iaMetadata.prompts_debug)) {
            debugTextPrompts = iaMetadata.prompts_debug;
        }

        contentSets = iaSets.map((t, idx): EmailContentSet => {
          const clean = sanitizeCopy({
            subject: t.subject || "",
            preheader: t.preheader || "",
            body: t.body?.content || "",
            cta: t.cta,
          });

          const titleClean = sanitizeHeading(t.body?.title ?? "", "");
          const subtitleClean = sanitizeSubheading(
            t.body?.subtitle ?? null,
            null
          );

          const rawId = t.id ?? idx + 1;
          const idNum = Number(String(rawId).match(/\d+/)?.[0] ?? idx + 1);

          return {
            id: idNum,
            subject: clean.subject,
            preheader: clean.preheader,
            body: {
              title: titleClean,
              subtitle: subtitleClean,
              content: clean.body,
            },
            cta: clean.cta,
          };
        });
      } catch (e) {
        iaEngineError = e;
        console.warn("[emails_v2] IA Engine falló:", e);
        contentSets = [];
      }
    } else {
      console.warn(
        "[emails_v2] IA Engine está deshabilitado (IA_ENGINE_ENABLED=0/false). No se generará texto."
      );
    }

    // 2.2 Si IA Engine no está activo o no devolvió nada usable → error explícito
    if (!contentSets.length) {
      const msg = IA_ENGINE_ENABLED
        ? `No se pudo generar el texto desde el IA Engine. Detalle: ${
            (iaEngineError as any)?.message || "sin detalle adicional"
          }`
        : "IA Engine está deshabilitado en el backend. Habilítalo o revisa la configuración.";

      console.error("[emails_v2] ERROR: contentSets vacío. ", msg);

      // Limpieza tmp (no bloquea la respuesta si falla)
      fs.rm(tmpOutDir, { recursive: true, force: true }).catch(() => {});

      return res.status(502).json({
        ok: false,
        error: msg,
      });
    }

    // Limpieza tmp (no bloquea)
    fs.rm(tmpOutDir, { recursive: true, force: true }).catch(() => {});

    /* 3) Subir batch.json + _manifest.json + prompts_debug.json a GCS */
    
    // <--- NUEVO: Construir y subir prompts_debug.json
    const promptsJson = {
        batchId,
        createdAt,
        campaign,
        cluster,
        prompts: {
            images: debugImagePrompts,
            text: debugTextPrompts
        }
    };
    await uploadJson(`emails_v2/${batchId}/prompts_debug.json`, promptsJson);

    const batchJson = {
      batchId,
      type: "emails_v2",
      createdAt,
      campaign,
      cluster,
      sets: contentSets,
      images: imagesOut,
    };
    const batchKey = `emails_v2/${batchId}/batch.json`;
    const manifestKey = `emails_v2/${batchId}/_manifest.json`;

    await uploadJson(batchKey, batchJson);
    await uploadJson(manifestKey, {
      batchId,
      createdAt,
      campaign,
      cluster,
      totalSets: contentSets.length,
      totalImages: imagesOut.length,
      environment: process.env.GCP_PREFIX || "dev",
      images: imagesOut.map((x) => ({
        fileName: x.fileName,
        sizeDeclared: x.meta?.size,
        sizeNormalized: x.meta?.sizeNormalized,
        quality: x.meta?.quality,
      })),
    });

    // ========================================================
    // [MEJORA] Actualización del Historial "Instantáneo"
    // ========================================================
    // Llamamos al servicio para agregar este lote al top del index.
    try {
      await addToHistoryIndex({
        batchId,
        count: contentSets.length, // O max(contentSets.length, imagesOut.length)
        createdAt,
      });
    } catch (idxErr) {
      // Si falla la actualización del índice, no detenemos el request.
      console.warn("[emails_v2] No se pudo actualizar history_index.json:", idxErr);
    }
    // ========================================================

    /* 4) Responder */
    if (!aborted) {
      res.json({
        batchId,
        createdAt,
        bucketRoot: `gs://${process.env.GCP_BUCKET_NAME}/${withPrefix(
          `emails_v2/${batchId}/`
        )}`,
        jsonUrl: cloudBrowserUrl(batchKey),
        manifestUrl: cloudBrowserUrl(manifestKey),
        // Opcional: retornamos la URL del debug por si la quieres usar en el frontend algún día
        promptsDebugUrl: cloudBrowserUrl(`emails_v2/${batchId}/prompts_debug.json`), 
        sets: contentSets,
        images: imagesOut,
      });
    } else {
      console.warn("[emails_v2] response skipped because request was aborted");
    }
  } catch (e: any) {
    const { status, message } = extractOpenAIError(e);
    console.error("[emails_v2] error:", status, message);
    if (!res.headersSent) {
      if (status === 429 || /billing_hard_limit_reached/.test(String(message))) {
        return res.status(429).json({ ok: false, error: `OpenAI: ${message}` });
      }
      return res
        .status(status || 500)
        .json({ ok: false, error: message || "Error generando Email 2.0" });
    }
  }
});

/* ========= PUT /api/emails-v2/:batchId ========= */
emailsV2Router.put("/:batchId", async (req, res) => {
  try {
    const batchId = String(req.params.batchId || "");
    if (!batchId)
      return res
        .status(400)
        .json({ ok: false, error: "batchId requerido" });

    const incomingSets = Array.isArray(req.body?.sets) ? req.body.sets : [];
    const sets = sanitizeContentSets(incomingSets);

    const batchKey = `emails_v2/${batchId}/batch.json`;

    // 1) Intentar leer batch actual
    let current: any | null = null;
    try {
      current = await readJsonFromBucket<any>(batchKey);
    } catch {
      current = null;
    }

    // 2) Si no pudimos leer batch.json, tratamos de hidratar desde _manifest.json
    if (!current) {
      try {
        const manifestKey = `emails_v2/${batchId}/_manifest.json`;
        const m = await readJsonFromBucket<any>(manifestKey);
        const images = Array.isArray(m?.images)
          ? m.images.map((it: any) => ({
              fileName: String(it?.fileName || ""),
              heroUrl: gcsDirectUrl(
                `emails_v2/${batchId}/${String(it?.fileName || "")}`,
                batchId
              ),
              meta: {
                size: it?.sizeDeclared,
                sizeNormalized: it?.sizeNormalized,
              },
            }))
          : [];

        current = {
          batchId,
          type: "emails_v2",
          createdAt: m?.createdAt || new Date().toISOString(),
          campaign: m?.campaign,
          cluster: m?.cluster,
          images,
          sets: [],
        };
      } catch {
        // 3) Por seguridad NO sobreescribimos si no podemos conservar imágenes
        return res.status(409).json({
          ok: false,
          error:
            "No se pudo leer batch.json ni _manifest.json. Para evitar pérdida de imágenes, no se guardó. Reintenta o recarga.",
        });
      }
    }

    const updated = { ...current, sets, updatedAt: new Date().toISOString() };
    await uploadJson(batchKey, updated);

    res.json({
      ok: true,
      batchId,
      setCount: sets.length,
      imageCount: Array.isArray(updated.images) ? updated.images.length : 0,
      updatedAt: updated.updatedAt,
    });
  } catch (e: any) {
    const { status, message } = extractOpenAIError(e);
    return res
      .status(status || 500)
      .json({ ok: false, error: message || "Error guardando Email 2.0" });
  }
});

/* ========= POST /api/generate-emails-v2/render-email-html ========= */
generateEmailsV2Router.post("/render-email-html", async (req, res) => {
  try {
    type RenderData = {
      subject: string;
      preheader?: string;
      title?: string;
      body: string;
      subtitle?: string | null;
      heroUrl?: string;
      heroAlt?: string;
      baseUrl?: string;

      // Emulación de marca
      headerLogoUrl?: string;
      footerLogoUrl?: string;
      showBrandHeader?: boolean;

      // Compat (ignorados para CTA/enlaces)
      brandColor?: string;
      unsubscribeUrl?: string;
      companyAddress?: string;
      companyName?: string;
      cta?: string;
    };

    const {
      batchId,
      selectedSet = 1,
      selectedImage = 1,
      data,
      save = false,
      fileName,
    }: {
      batchId?: string;
      selectedSet?: number;
      selectedImage?: number;
      data: RenderData;
      save?: boolean;
      fileName?: string;
    } = req.body || {};

    if (!data || !data.subject || !data.body) {
      return res
        .status(400)
        .json({ ok: false, error: "Faltan 'subject' y 'body' en data." });
    }

    // Resolver hero
    let heroUrl = (data.heroUrl || "").trim();
    if (!heroUrl && batchId) {
      try {
        const batchKey = `emails_v2/${batchId}/batch.json`;
        const current = await readJsonFromBucket<any>(batchKey);
        const idx = Math.max(0, Number(selectedImage) - 1);
        const img = Array.isArray(current?.images) ? current.images[idx] : null;
        if (img?.fileName) {
          heroUrl = gcsDirectUrl(
            `emails_v2/${batchId}/${img.fileName}`,
            batchId
          );
        } else if (img?.heroUrl) {
          heroUrl = String(img.heroUrl);
        }
      } catch {
        // ignore
      }
    }

    const html = renderEmailHTML({
      subject: String(data.subject || ""),
      preheader: String(data.preheader || ""),
      title: String(data.title ?? ""),
      subtitle: data.subtitle ?? null,
      body: String(data.body || ""),
      heroUrl: String(heroUrl || ""),
      heroAlt: data.heroAlt,
      baseUrl: data.baseUrl,
      headerLogoUrl: data.headerLogoUrl,
      footerLogoUrl: data.footerLogoUrl,
      showBrandHeader: Boolean(data.showBrandHeader),
    });

    if (!save || !batchId) {
      return res.json({ ok: true, html });
    }

    const fname =
      fileName ||
      `email_S${String(selectedSet).padStart(2, "0")}_I${String(
        selectedImage
      ).padStart(2, "0")}.html`;
    const key = `emails_v2/${batchId}/${fname}`;

    await uploadBuffer(
      key,
      Buffer.from(html, "utf-8"),
      "text/html; charset=utf-8",
      true
    );

    return res.json({
      ok: true,
      html,
      key: withPrefix(key),
      url: cloudBrowserUrl(key),
    });
  } catch (e: any) {
    return res
      .status(500)
      .json({ ok: false, error: e?.message || "Error renderizando HTML" });
  }
});