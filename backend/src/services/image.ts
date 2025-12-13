// backend/src/services/image.ts
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";
import { getOpenAI } from "./openai";
import { getImagePromptFromIA } from "./iaEngine"; // <--- IMPORTANTE: Usamos el servicio

/** ===== Helpers internos ===== */
function pad2(n: number) {
  return String(n + 1).padStart(2, "0");
}
async function writeBuffer(p: string, buf: Buffer) {
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, buf);
}

/** Tipos utilitarios estrictos */
type ImageSizeUnion = "1536x1024" | "1024x1024" | "1024x1536";

// AJUSTE: Exportamos para usar en rutas y definimos los niveles soportados
export type ImageQualityUnion = "medium" | "high" | "low" | "auto";

/** 🔧 Selector de tamaño */
function pickSizeForModel(raw?: string): ImageSizeUnion {
  const defaultSize: ImageSizeUnion = "1536x1024";
  const allowed: ImageSizeUnion[] = ["1536x1024", "1024x1024", "1024x1536"];
  const incoming = (raw || "").trim() as ImageSizeUnion;
  return allowed.includes(incoming) ? incoming : defaultSize;
}

/** 🔧 Selector de Calidad (NUEVO) */
// Por defecto usamos "low" como solicitaste para el nivel más bajo/económico
function pickQuality(raw?: string): ImageQualityUnion {
  const allowed: ImageQualityUnion[] = ["medium", "high", "low", "auto"];
  const incoming = (raw || "").trim() as ImageQualityUnion;
  return allowed.includes(incoming) ? incoming : "low";
}

/** =========================
 * Normalizador
 * ========================= */
export type NormalizeMode = "cover" | "contain" | "inside";

export async function normalizeJpeg(
  inputPath: string,
  outputPath: string,
  {
    mode = "cover",
    quality = 90,
    width = 1536,
    height = 1024,
  }: { mode?: NormalizeMode; quality?: number; width?: number; height?: number } = {}) {
  
  // Intento con smart crop (attention)
  await sharp(inputPath)
    .rotate()
    .resize(width, height, {
      fit: mode === "cover" ? "cover" : mode === "inside" ? "inside" : "contain",
      position: "attention",
      withoutEnlargement: false,
      background: mode === "contain" ? { r: 255, g: 255, b: 255, alpha: 1 } : undefined,
    })
    .toColourspace("srgb")
    .jpeg({ quality, mozjpeg: true, progressive: true, chromaSubsampling: "4:4:4" })
    .toFile(outputPath);

  const meta = await sharp(outputPath).metadata();
  
  // Verificación y fallback
  if (meta.width !== width || meta.height !== height) {
    await sharp(inputPath)
      .rotate()
      .resize(width, height, {
        fit: mode,
        position: "center",
        withoutEnlargement: false,
        background: mode === "contain" ? { r: 255, g: 255, b: 255, alpha: 1 } : undefined,
      })
      .toColourspace("srgb")
      .jpeg({ quality, mozjpeg: true, progressive: true })
      .toFile(outputPath);
  }
}

/** ===== Timeout & Download Helpers ===== */
function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: any;
  const timeout = new Promise<never>((_, rej) => {
    timer = setTimeout(() => rej(new Error(`timeout:${label}:${ms}ms`)), ms);
  });
  try {
    const out = await Promise.race([p, timeout]);
    clearTimeout(timer);
    return out;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

async function downloadImageToBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fallo descargando imagen: ${res.statusText}`);
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

/** ===== Fallback local (banner sólido) ===== */
async function createFallbackBanner(finalPath: string, rawPath: string) {
  const fallback = sharp({
    create: {
      width: 1536,
      height: 1024,
      channels: 3,
      background: { r: 235, g: 240, b: 248 },
    },
  })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();

  await writeBuffer(rawPath, await fallback);
  await writeBuffer(finalPath, await fallback);
  return { width: 1536, height: 1024 };
}

/**
 * Genera la imagen HÉROE.
 */
export async function generateHeroPNG({
  campaign,
  cluster,
  outDir,
  versionIndex,
  promptHint,
  mode = "cover",
  quality, // <--- NUEVO: Recibe parámetro de calidad
}: {
  campaign: string;
  cluster: string;
  outDir: string;
  versionIndex: number;
  promptHint?: string;
  mode?: NormalizeMode;
  quality?: string; // string que será validado internamente
}) {
  const client = getOpenAI();
  
  const MODEL = "gpt-image-1";
  // Usamos el helper para definir la calidad (default "low")
  const QUALITY: ImageQualityUnion = pickQuality(quality); 
  const SIZE: ImageSizeUnion = pickSizeForModel(process.env.IMAGE_SIZE); 
  
  // <--- CAMBIO CRÍTICO: Pedimos el prompt al servicio de IA en Python
  // Esto asegura que se usen las reglas de Branding de Python (Clean Image Rule)
  console.log(`[image] Solicitando prompt optimizado a IA Engine...`);
  const prompt = await getImagePromptFromIA({
      campaign,
      cluster,
      feedback: promptHint
  });

  const base = `hero_v${pad2(versionIndex)}`;
  const tmpPath = path.join(outDir, `${base}.tmp.jpg`);
  const rawName = `${base}.raw.jpg`;
  const rawPath = path.join(outDir, rawName);
  const finalName = `${base}.jpg`;
  const finalPath = path.join(outDir, finalName);

  let imageBuffer: Buffer | undefined;
  let lastErr: any;

  const MAX_ATTEMPTS = 2;
  const PER_ATTEMPT_TIMEOUT = 120000;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(
        `[image] attempt ${attempt}/${MAX_ATTEMPTS} model=${MODEL} size=${SIZE} quality=${QUALITY}`
      );
      
      const res = await withTimeout(
        client.images.generate({
          model: MODEL,
          prompt: prompt, // Usamos el prompt traído de Python
          size: SIZE,
          quality: QUALITY, // <--- Usamos la variable dinámica
          n: 1,
        }),
        PER_ATTEMPT_TIMEOUT,
        "images.generate"
      );
      
      const dataItem = res.data?.[0];
      
      if (dataItem?.b64_json) {
        imageBuffer = Buffer.from(dataItem.b64_json, "base64");
      } else if (dataItem?.url) {
        console.log("[image] Descargando imagen desde URL...");
        imageBuffer = await downloadImageToBuffer(dataItem.url);
      }

      if (imageBuffer) break;
      lastErr = new Error("La API no retornó ni url ni b64_json.");

    } catch (e: any) {
      lastErr = e;
      const msg = e?.response?.data?.error?.message || e?.message || String(e);
      console.warn(`[image] attempt ${attempt} failed: ${msg}`);
      
      if (msg.includes("content policy")) break;
      await delay(1500);
    }
  }

  // Fallback
  if (!imageBuffer) {
    console.error(`[image] Falló generación tras ${MAX_ATTEMPTS} intentos. Usando fallback.`);
    const metaFallback = await createFallbackBanner(finalPath, rawPath);
    return {
      fileName: finalName,
      url: finalName,
      rawFileName: rawName,
      meta: {
        model: `${MODEL} (fallback)`,
        size: SIZE,
        width: metaFallback.width,
        height: metaFallback.height,
        quality: QUALITY,
        sizeNormalized: `${metaFallback.width}x${metaFallback.height}`,
        fallback: true,
        error: lastErr?.message,
        prompt: prompt, 
      } as any,
    };
  }

  // Procesamiento de éxito
  await writeBuffer(tmpPath, imageBuffer);

  // Guardamos RAW
  await sharp(tmpPath)
    .rotate()
    .toColourspace("srgb")
    .jpeg({ quality: 100, mozjpeg: true })
    .toFile(rawPath);

  // Normalizamos
  await normalizeJpeg(tmpPath, finalPath, {
    mode,
    width: 1536,
    height: 1024,
    quality: 90,
  });

  try { await fs.unlink(tmpPath); } catch {}

  const finalMeta = await sharp(finalPath).metadata();

  return {
    fileName: finalName,
    url: finalName,
    rawFileName: rawName,
    meta: {
      model: MODEL,
      size: SIZE,
      width: finalMeta.width,
      height: finalMeta.height,
      quality: QUALITY,
      sizeNormalized: `${finalMeta.width}x${finalMeta.height}`,
      prompt: prompt,
    },
  };
}

/**
 * Banner genérico
 */
export async function generateBannerJPG({
  prompt,
  outDir,
  fileName,
  mode = "cover",
}: {
  prompt: string;
  outDir: string;
  fileName?: string;
  mode?: NormalizeMode;
}) {
  const client = getOpenAI();
  
  const MODEL = "gpt-image-1";
  const QUALITY: ImageQualityUnion = "medium";
  const SIZE: ImageSizeUnion = pickSizeForModel(process.env.IMAGE_SIZE);

  const base = (
    fileName?.replace(/\.(jpg|jpeg|png|webp)$/i, "") ||
    `banner_${Date.now()}`
  ).trim();
  
  const tmpPath = path.join(outDir, `${base}.tmp.jpg`);
  const rawName = `${base}.raw.jpg`;
  const rawPath = path.join(outDir, rawName);
  const finalName = `${base}.jpg`;
  const finalPath = path.join(outDir, finalName);

  let imageBuffer: Buffer | undefined;
  let lastErr: any;

  const MAX_ATTEMPTS = 2;
  const PER_ATTEMPT_TIMEOUT = 120000; 

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(
        `[banner] attempt ${attempt}/${MAX_ATTEMPTS} model=${MODEL} size=${SIZE} quality=${QUALITY}`
      );
      
      const res = await withTimeout(
        client.images.generate({
          model: MODEL,
          prompt: prompt,
          size: SIZE,
          quality: QUALITY,
          n: 1,
        }),
        PER_ATTEMPT_TIMEOUT,
        "images.generate"
      );
      
      const dataItem = res.data?.[0];
      if (dataItem?.b64_json) {
        imageBuffer = Buffer.from(dataItem.b64_json, "base64");
      } else if (dataItem?.url) {
        imageBuffer = await downloadImageToBuffer(dataItem.url);
      }

      if (imageBuffer) break;
      lastErr = new Error("La API no retornó datos válidos.");
    } catch (e: any) {
      lastErr = e;
      console.warn(`[banner] attempt ${attempt} failed:`, e?.message || e);
      await delay(1500);
    }
  }

  if (!imageBuffer) {
    console.error("[banner] Falló generación. Usando fallback.");
    const metaFallback = await createFallbackBanner(finalPath, rawPath);
    return {
      fileName: finalName,
      url: finalName,
      rawFileName: rawName,
      meta: {
        model: `${MODEL} (fallback)`,
        size: SIZE,
        width: metaFallback.width,
        height: metaFallback.height,
        quality: QUALITY,
        sizeNormalized: `${metaFallback.width}x${metaFallback.height}`,
        fallback: true,
        error: lastErr?.message,
        prompt: prompt, 
      } as any,
    };
  }

  await writeBuffer(tmpPath, imageBuffer);

  await sharp(tmpPath)
    .rotate()
    .toColourspace("srgb")
    .jpeg({ quality: 100, mozjpeg: true })
    .toFile(rawPath);

  await normalizeJpeg(tmpPath, finalPath, {
    mode,
    width: 1536,
    height: 1024,
    quality: 90,
  });

  try { await fs.unlink(tmpPath); } catch {}

  const finalMeta = await sharp(finalPath).metadata();

  return {
    fileName: finalName,
    url: finalName,
    rawFileName: rawName,
    meta: {
      model: MODEL,
      size: SIZE,
      width: finalMeta.width,
      height: finalMeta.height,
      quality: QUALITY,
      sizeNormalized: `${finalMeta.width}x${finalMeta.height}`,
    },
  };
}