// frontend/src/lib/api.ts

/**
 * Configuración base de API
 *
 * - Dev (npm run dev):
 *    API_BASE = ""  → el frontend llama a /api/... y Vite hace proxy al backend
 *    (ver frontend/vite.config.ts)
 *
 * - Prod/Stage (build + Cloud Run):
 *    API_BASE:
 *      1) Si VITE_API_BASE viene en el build → se usa esa.
 *      2) Si NO viene → fallback fijo al backend Cloud Run.
 */

const IS_DEV = (import.meta as any).env?.DEV as boolean;
const RAW_API_BASE = (import.meta as any).env?.VITE_API_BASE as
  | string
  | undefined;

// 🔴 AJUSTA AQUÍ si cambia la URL del backend
const PROD_FALLBACK_API_BASE =
  "https://backend-151554496273.europe-west1.run.app";

function normalizeBase(base: string | undefined): string {
  if (!base) return "";
  return base.replace(/\/+$/, "");
}

// En dev usamos proxy → ""
// En prod: VITE_API_BASE si existe, si no, fallback fijo
let API_BASE_INTERNAL: string;

if (IS_DEV) {
  API_BASE_INTERNAL = "";
} else {
  const fromEnv = normalizeBase(RAW_API_BASE);
  API_BASE_INTERNAL = fromEnv || PROD_FALLBACK_API_BASE;

  if (!fromEnv) {
    // eslint-disable-next-line no-console
    console.warn(
      "[api.ts] VITE_API_BASE no definida en build; usando fallback:",
      PROD_FALLBACK_API_BASE
    );
  }
}

export const API_BASE: string = API_BASE_INTERNAL;

type TimeoutOptions = { timeoutMs?: number };

function buildUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

/** Timeout helper */
export function withTimeout(ms: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(id),
  };
}

/**
 * Lee respuesta como JSON si corresponde; si no, como texto
 * e intenta parsear a JSON. Último fallback: { error: string }.
 */
async function parseSmart(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined;

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

/**
 * fetch JSON robusto + timeout + bubbling de error detallado.
 * Siempre apunta a API_BASE + path.
 */
export async function fetchJson<T>(
  path: string,
  init?: RequestInit,
  opts: TimeoutOptions = {}
): Promise<T> {
  const url = buildUrl(path);
  const { timeoutMs = 45_000 } = opts;
  const t = withTimeout(timeoutMs);

  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      signal: t.signal,
      ...init,
    });

    const payload = (await parseSmart(res)) as any;

    if (!res.ok) {
      const msg =
        payload?.message ||
        payload?.error ||
        `${res.status} ${res.statusText}` ||
        "Error desconocido";

      console.error("API error payload:", payload);
      throw new Error(msg);
    }

    return payload as T;
  } finally {
    t.clear();
  }
}

/** POST JSON tipado */
export async function postJson<T>(
  path: string,
  body: unknown,
  opts?: TimeoutOptions
): Promise<T> {
  return fetchJson<T>(
    path,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    opts
  );
}

/**
 * Alias semántico cuando quieres enfatizar que es JSON.
 * Firma idéntica a fetchJson.
 */
export const apiJson = fetchJson;

/**
 * Devuelve una URL absoluta para imágenes.
 * - Si ya viene absoluta → se deja igual.
 * - Si es relativa → se monta sobre window.location.origin.
 */
export function absoluteImageUrl(url?: string): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;

  const base = window.location.origin.replace(/\/+$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
}

/**
 * Sube un lote completo a GCP llamando al backend.
 * @deprecated Preferir el flujo nuevo de Email 2.0 cuando sea posible.
 */
export async function uploadToGCP(
  batchId: string,
  type: "emails" | "emails_v2" | "blog" | "ads" | "social" | "meta" = "emails_v2"
): Promise<unknown> {
  return postJson("/api/upload-to-gcp", { batchId, type });
}
