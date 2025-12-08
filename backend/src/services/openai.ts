// backend/src/services/openai.ts
import OpenAI from "openai";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

/**
 * Carga backend/.env si existe
 */
const envPath = path.resolve(__dirname, "..", "..", ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

/** =========================
 * Configuración (env)
 * ========================= */
const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim();
const OPENAI_ORG = process.env.OPENAI_ORG?.trim();
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL?.trim();

// Texto
const OPENAI_TEXT_MODEL =
  process.env.OPENAI_TEXT_MODEL?.trim() ||
  process.env.OPENAI_MODEL?.trim() ||
  process.env.OPENAI_TEXT_JSON?.trim() ||
  "gpt-4o-mini";

const OPENAI_TEMPERATURE =
  process.env.OPENAI_TEMPERATURE != null ? Number(process.env.OPENAI_TEMPERATURE) : 0.7;
const OPENAI_TOP_P =
  process.env.OPENAI_TOP_P != null ? Number(process.env.OPENAI_TOP_P) : undefined;
const OPENAI_MAX_TOKENS =
  process.env.OPENAI_MAX_TOKENS != null ? Number(process.env.OPENAI_MAX_TOKENS) : 1000;

// Imágenes
const OPENAI_IMAGE_MODEL =
  process.env.OPENAI_IMAGE_MODEL?.trim() ||
  process.env.IMAGE_MODEL?.trim() ||
  process.env.OPENAI_IMAGE?.trim() || 
  "gpt-image-1";

// Defaults para imágenes
// AJUSTE: Default a 1536x1024 (Horizontal soportado)
const IMAGE_SIZE_RAW = (process.env.IMAGE_SIZE?.trim() || "1536x1024").toLowerCase();
// AJUSTE: Default a "medium" (Standard no es soportado por tu modelo)
const IMAGE_QUALITY_RAW = (process.env.IMAGE_QUALITY?.trim() || "medium").toLowerCase();

// Timeout aumentado por defecto
const OPENAI_TIMEOUT_MS =
  process.env.OPENAI_TIMEOUT_MS != null ? Number(process.env.OPENAI_TIMEOUT_MS) : 120_000;

/** =========================================
 * Cliente Singleton
 * ========================================= */
let _client: OpenAI | null = null;
export function getOpenAI() {
  if (!OPENAI_API_KEY) {
    throw new Error("Falta OPENAI_API_KEY en backend/.env");
  }
  if (_client) return _client;
  _client = new OpenAI({
    apiKey: OPENAI_API_KEY,
    ...(OPENAI_ORG ? { organization: OPENAI_ORG } : {}),
    ...(OPENAI_BASE_URL ? { baseURL: OPENAI_BASE_URL } : {}),
    timeout: OPENAI_TIMEOUT_MS,
  });
  return _client;
}

/** =========================================
 * Extractor de errores
 * ========================================= */
export function extractOpenAIError(e: any): { status?: number; message: string } {
  const status = e?.status || e?.response?.status;
  
  let message = "Error con OpenAI";
  if (typeof e === 'string') {
    message = e;
  } else if (e?.response?.data?.error?.message) {
    message = e.response.data.error.message;
  } else if (e?.error?.message) {
    message = e.error.message;
  } else if (e?.message) {
    message = e.message;
  }

  return { status, message };
}

/** =========================================
 * Config helpers
 * ========================================= */
export function getTextModelConfig() {
  return {
    model: OPENAI_TEXT_MODEL,
    temperature: OPENAI_TEMPERATURE,
    top_p: OPENAI_TOP_P,
    max_tokens: OPENAI_MAX_TOKENS,
  };
}

export function getImageModelConfig() {
  let size = IMAGE_SIZE_RAW;
  // Validamos contra los valores que te dice el error log
  const allowedSizes = ["1536x1024", "1024x1024", "1024x1536", "auto"];
  
  if (!allowedSizes.includes(size)) {
    size = "1536x1024"; // Fallback seguro
  }

  let quality = IMAGE_QUALITY_RAW;
  // AJUSTE: Validamos contra los valores soportados (medium, high, low)
  if (!["medium", "high", "low", "auto"].includes(quality)) {
    quality = "medium";
  }

  return {
    model: OPENAI_IMAGE_MODEL,
    size,
    quality,
  };
}

/** =========================
 * Utilidades JSON robustas
 * ========================= */
function stripCodeFences(s: string) {
  return String(s || "").replace(/```json|```/gi, "").trim();
}

function tryParseJSON<T = any>(raw: string): T {
  const cleaned = stripCodeFences(raw);
  try {
    return JSON.parse(cleaned);
  } catch {}
  
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const maybe = cleaned.slice(start, end + 1);
    try {
      return JSON.parse(maybe);
    } catch {}
  }
  throw new Error("No se pudo parsear JSON de la respuesta del modelo.");
}

/** =========================================
 * chatJSON
 * ========================================= */
export async function chatJSON<T = any>({
  system,
  user,
  model = OPENAI_TEXT_MODEL,
  temperature = OPENAI_TEMPERATURE,
  top_p = OPENAI_TOP_P,
  max_tokens = OPENAI_MAX_TOKENS,
  retries = 2,
}: {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  retries?: number;
}): Promise<T> {
  const client = getOpenAI();
  let lastErr: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await client.chat.completions.create({
        model,
        temperature,
        top_p,
        max_tokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      });
      const content = resp.choices?.[0]?.message?.content ?? "";
      return tryParseJSON<T>(content);
    } catch (e: any) {
      lastErr = e;
      const status = e?.status || 500;
      if (status >= 400 && status < 500 && status !== 429) {
        break; 
      }
      if (attempt < retries) continue;
    }
  }
  
  const parsed = extractOpenAIError(lastErr);
  const err = new Error(parsed.message || "Fallo chatJSON");
  (err as any).status = parsed.status || 502;
  throw err;
}