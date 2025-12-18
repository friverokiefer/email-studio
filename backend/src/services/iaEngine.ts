// backend/src/services/iaEngine.ts
import "dotenv/config";
import { GenerateEmailResponseSchema } from "../lib/ia-engine.schema";

/* ============================================================
 * Tipos
 * ============================================================ */

export type IaEngineFeedback = {
  subject?: string;
  preheader?: string;
  bodyContent?: string; // canonical
  body?: string; // compat
};

export type EmailSetLike = {
  id: number;
  subject: string;
  preheader: string;
  body: {
    title: string;
    subtitle?: string | null;
    content: string;
  };
  cta?: string;
};

// NUEVO: Interfaz para tipar la respuesta del prompt de imagen y evitar errores de TS
interface IaImagePromptResponse {
  prompt: string;
}

/* ============================================================
 * Configuración
 * ============================================================ */

// IMPORTANTE: En Docker, IA_ENGINE_BASE_URL debe ser "http://ia-engine:8000"
// Evitamos reemplazar "localhost" ciegamente, ya que en Docker los hostnames son distintos.
const DEFAULT_BASE_URL = "http://127.0.0.1:8000";
const rawBase = process.env.IA_ENGINE_BASE_URL || DEFAULT_BASE_URL;

export const IA_ENGINE_BASE_URL = rawBase.replace(/\/+$/, "");

export const IA_ENGINE_ENABLED =
  process.env.IA_ENGINE_ENABLED === "1" ||
  process.env.IA_ENGINE_ENABLED?.toLowerCase() === "true";

// Log de arranque para verificar conexión en logs de Docker
console.log(`[iaEngine] Configurado con URL: ${IA_ENGINE_BASE_URL}`);

/* ============================================================
 * Helper: fetch con timeout
 * ============================================================ */

async function fetchWithTimeout(
  resource: string,
  options: any = {},
  timeoutMs = 600000 // ✅ DEFAULT: 600s (10 min) para procesos largos con imágenes
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return res;
  } catch (err: any) {
    clearTimeout(id);
    const msg = err.name === 'AbortError' ? 'Request Timeout' : (err.message || err);
    throw new Error(`IA Engine connection error (${resource}): ${msg}`);
  }
}

/* ============================================================
 * Llamar Microservicio IA Engine (Python / FastAPI)
 * ============================================================ */

// AJUSTE: Retornamos objeto compuesto { sets, metadata }
export async function generateEmailSetsViaIAEngine(params: {
  campaign: string;
  cluster: string;
  setCount: number;
  temperature?: number; // <--- NUEVO: Parámetro opcional
  feedback?: IaEngineFeedback;
}): Promise<{ sets: EmailSetLike[]; metadata: any }> {
  
  if (!IA_ENGINE_ENABLED) {
    console.warn("[iaEngine] IA_ENGINE_ENABLED=0 → devolviendo vacío.");
    return { sets: [], metadata: {} };
  }

  const payload = {
    campaign: params.campaign,
    cluster: params.cluster,
    sets: params.setCount,
    temperature: params.temperature, // <--- NUEVO: Se envía al microservicio Python
    feedback: params.feedback ?? undefined,
  };

  const url = `${IA_ENGINE_BASE_URL}/ia/generate`;

  console.log(`[iaEngine] POST → ${url}`);

  /* -------------------------------
   * Llamada HTTP real
   * ------------------------------- */
  let res: Response;
  try {
    res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      600000 // ✅ EXPLICIT: Timeout de 600s (10 min) para este endpoint crítico
    );
  } catch (netErr: any) {
    console.error("[iaEngine] Network Error:", netErr.message);
    throw netErr;
  }

  if (!res.ok) {
    let text = "";
    try {
      text = await res.text();
    } catch (_) {}
    const errMsg = `IA Engine responded ${res.status}: ${text.slice(0, 300) || res.statusText}`;
    console.error(`[iaEngine] Error Response: ${errMsg}`);
    throw new Error(errMsg);
  }

  /* -------------------------------
   * Parseo JSON seguro + validación schema
   * ------------------------------- */
  let raw: unknown;
  try {
    raw = await res.json();
  } catch (err) {
    throw new Error(`IA Engine JSON parse error: ${err}`);
  }

  // Validación Zod para asegurar contrato
  const parsed = GenerateEmailResponseSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(
      "[iaEngine] Zod Validation Failed:",
      parsed.error.flatten()
    );
    throw new Error(
      "IA Engine retornó datos que no coinciden con el esquema esperado (GenerateEmailResponse)."
    );
  }

  const variants: any[] = Array.isArray(parsed.data.variants)
    ? parsed.data.variants
    : [];

  /* ============================================================
   * Mapeo tipado de respuesta
   * ============================================================ */
  const mapped: EmailSetLike[] = variants
    .map((v: any, idx: number): EmailSetLike => {
      const rawId = v?.id ?? idx + 1;
      const idNum = Number(String(rawId).match(/\d+/)?.[0] ?? idx + 1);

      const body = v?.body ?? {};

      return {
        id: idNum,
        subject: String(v?.subject ?? "").trim(),
        preheader: String(v?.preheader ?? "").trim(),
        body: {
          title: String(body?.title ?? "").trim(),
          subtitle:
            body?.subtitle == null || body?.subtitle === ""
              ? null
              : String(body.subtitle),
          content: String(body?.content ?? "").trim(),
        },
        cta: v?.cta ? String(v.cta).trim() : undefined,
      };
    })
    .filter(
      (t: EmailSetLike) => t.subject || t.preheader || t.body.content
    );

  console.log(`[iaEngine] ✔️ Recibidas ${mapped.length} variantes.`);

  return {
    sets: mapped,
    metadata: parsed.data.metadata || {}
  };
}

/* ============================================================
 * NUEVO: Obtener Prompt de Imagen (Prompt as a Service)
 * ============================================================ */
export async function getImagePromptFromIA(params: {
  campaign: string;
  cluster: string;
  feedback?: string;
}): Promise<string> {
  // Fallback seguro si el motor está apagado o falla
  const fallback = `Hero image for bank campaign: ${params.campaign}, cluster: ${params.cluster}. ${params.feedback || ""}`;

  if (!IA_ENGINE_ENABLED) {
    console.warn("[iaEngine] Deshabilitado. Retornando fallback prompt local.");
    return fallback;
  }

  const url = `${IA_ENGINE_BASE_URL}/ia/image-prompt`;
  
  // Pasamos feedback si existe
  const payload = {
    campaign: params.campaign,
    cluster: params.cluster,
    feedback: params.feedback || null
  };

  try {
    // Timeout corto (10s) porque es solo construir texto
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }, 10000);

    if (!res.ok) {
      throw new Error(`Status ${res.status}`);
    }

    // CORRECCIÓN TS: Usamos la interfaz definida arriba para el casteo
    const data = (await res.json()) as IaImagePromptResponse;
    
    if (data && typeof data.prompt === "string") {
      return data.prompt;
    }
    
    throw new Error("Respuesta inválida (falta campo 'prompt')");
  } catch (err: any) {
    console.error(`[iaEngine] Error obteniendo image prompt: ${err.message}`);
    // Retornamos fallback para no detener el flujo de generación
    return fallback;
  }
}