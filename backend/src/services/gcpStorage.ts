// backend/src/services/gcpStorage.ts

import "dotenv/config"; // En local lee .env; en Cloud Run es inocuo
import fs from "fs";
import path from "path";
import { Storage, GetSignedUrlConfig } from "@google-cloud/storage";

/* =========================
 *  CONFIG BÁSICA DESDE ENV
 * ========================= */
const {
  GCP_PROJECT_ID,
  GCP_BUCKET_NAME,
  GOOGLE_APPLICATION_CREDENTIALS,
  GCP_PREFIX = "dev",
  GCP_PUBLIC_READ = "false",
  GCP_URL_STYLE = "direct", // 'direct' | 'console'
} = process.env;

function resolveKeyPath(p?: string | null): string | undefined {
  if (!p) return undefined;
  if (p.startsWith("./") || p.startsWith("../")) {
    return path.resolve(process.cwd(), p);
  }
  return p;
}

const keyPath = resolveKeyPath(GOOGLE_APPLICATION_CREDENTIALS);
const hasKeyFile = keyPath && fs.existsSync(keyPath);

// Antes tirabas error si el archivo no existía.
// Ahora solo avisamos y dejamos que GCP use ADC (service account del servicio).
if (keyPath && !hasKeyFile) {
  console.warn(
    `⚠️ GOOGLE_APPLICATION_CREDENTIALS apunta a ${keyPath}, ` +
      "pero el archivo no existe. Se usará Application Default Credentials (ADC)."
  );
}

// Opciones para Storage:
// - En Cloud Run: normalmente basta con projectId (o ni eso).
// - En local: si definiste GOOGLE_APPLICATION_CREDENTIALS y existe, se usa ese json.
const storageOptions: any = {};
if (GCP_PROJECT_ID) storageOptions.projectId = GCP_PROJECT_ID;
if (hasKeyFile) storageOptions.keyFilename = keyPath;

const storage = new Storage(storageOptions);

// OJO: si no hay bucket configurado, no reventamos aquí.
// Dejamos que las funciones que usan GCS validen y tiren error con mensaje decente.
const bucket = GCP_BUCKET_NAME ? storage.bucket(GCP_BUCKET_NAME) : null;

const isPublic = GCP_PUBLIC_READ === "true";
const urlStyle = ((GCP_URL_STYLE || "direct").toLowerCase() === "console"
  ? "console"
  : "direct") as "direct" | "console";

/** Exportamos la config usada por las rutas (no revienta si falta bucket) */
export const CFG = {
  PROJECT_ID: GCP_PROJECT_ID || "",
  BUCKET: GCP_BUCKET_NAME || "",
  PREFIX: String(GCP_PREFIX),
  PUBLIC_READ: isPublic,
  URL_STYLE: urlStyle,
};

if (GCP_BUCKET_NAME) {
  console.log(
    `✅ GCP listo → bucket=${GCP_BUCKET_NAME} · prefix=${GCP_PREFIX} · publicRead=${isPublic} · urlStyle=${urlStyle} · auth=${
      hasKeyFile ? "json-key" : "ADC"
    }`
  );
} else {
  console.warn(
    "⚠️ GCP_BUCKET_NAME no está definido. Las funciones que usan GCS lanzarán error si se llaman."
  );
}

/* =========================
 *  HELPERS DE RUTA Y URLs
 * ========================= */

function normalizeKey(p: string) {
  return String(p).replace(/^\/+/, "").replace(/\\/g, "/");
}

/** Aplica el prefijo de entorno (dev/, prod/, etc.) */
export function withPrefix(relativeKey: string): string {
  const normalized = normalizeKey(relativeKey);
  const prefix = `${String(GCP_PREFIX).replace(/^\/+|\/+$/g, "")}/`;
  return normalized.startsWith(prefix) ? normalized : `${prefix}${normalized}`;
}

/** URL pública directa (googleapis) */
export function publicDirectUrl(objectPath: string): string {
  const key = normalizeKey(withPrefix(objectPath));
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `https://storage.googleapis.com/${GCP_BUCKET_NAME}/${encoded}`;
}

/** URL del viewer (storage.cloud.google.com) — requiere sesión si el bucket no es público */
export function publicConsoleUrl(objectPath: string): string {
  const key = normalizeKey(withPrefix(objectPath));
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `https://storage.cloud.google.com/${GCP_BUCKET_NAME}/${encoded}`;
}

/** Alias útil para “URL pública” según estilo configurado */
export function publicObjectUrl(objectPath: string): string {
  return urlStyle === "console" ? publicConsoleUrl(objectPath) : publicDirectUrl(objectPath);
}

/** URL de consola (Detalles del objeto en GCP Console) */
export function cloudConsoleUrl(objectPath: string): string {
  const keyWithPrefix = withPrefix(objectPath).replace(/^\/+/, "");
  const encoded = keyWithPrefix.split("/").map(encodeURIComponent).join("/");
  const proj = encodeURIComponent(String(GCP_PROJECT_ID || ""));
  return `https://console.cloud.google.com/storage/browser/_details/${GCP_BUCKET_NAME}/${encoded}?project=${proj}`;
}

/** gs://bucket/key (info) */
export function toGsUri(objectPath: string): string {
  return `gs://${GCP_BUCKET_NAME}/${normalizeKey(withPrefix(objectPath))}`;
}

/** Por compatibilidad con código existente */
export const cloudBrowserUrl = publicConsoleUrl;

/* =========================
 *  MIME TYPES
 * ========================= */
export function detectContentTypeByExt(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    // imágenes
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".webp": return "image/webp";
    case ".gif": return "image/gif";
    case ".svg": return "image/svg+xml";
    case ".avif": return "image/avif";
    case ".ico": return "image/x-icon";
    // texto / datos
    case ".json": return "application/json";
    case ".jsonl": return "application/x-ndjson";
    case ".html": return "text/html; charset=utf-8";
    case ".txt": return "text/plain; charset=utf-8";
    case ".csv": return "text/csv; charset=utf-8";
    case ".md": return "text/markdown; charset=utf-8";
    case ".yaml":
    case ".yml": return "application/yaml";
    // binarios comunes
    case ".pdf": return "application/pdf";
    case ".zip": return "application/zip";
    case ".mp4": return "video/mp4";
    default:
      return "application/octet-stream";
  }
}

/* =========================
 *  GUARDIA DE BUCKET
 * ========================= */

function ensureBucket() {
  if (!bucket || !GCP_BUCKET_NAME) {
    throw new Error(
      "GCS no está configurado: falta GCP_BUCKET_NAME. " +
        "Configúralo en las variables de entorno del servicio backend en Cloud Run."
    );
  }
  return bucket;
}

/* =========================
 *  SUBIDAS
 * ========================= */

export async function uploadBuffer(
  objectPath: string,
  buffer: Buffer,
  contentType?: string,
  makePublic?: boolean
): Promise<{ gsUri: string; url?: string; consoleUrl?: string }> {
  const b = ensureBucket();
  const key = withPrefix(objectPath);
  const file = b.file(key);

  await file.save(buffer, {
    resumable: false,
    validation: "crc32c",
    contentType: contentType || detectContentTypeByExt(key),
    metadata: { cacheControl: "public, max-age=3600" },
  });

  const shouldPublic = makePublic ?? isPublic;
  if (shouldPublic) {
    try {
      await file.makePublic();
    } catch (err: any) {
      if (!String(err?.message || "").includes("uniform bucket-level access")) throw err;
      return { gsUri: toGsUri(key), consoleUrl: cloudConsoleUrl(key) };
    }
    return { gsUri: toGsUri(key), url: publicObjectUrl(key), consoleUrl: cloudConsoleUrl(key) };
  }

  return { gsUri: toGsUri(key), consoleUrl: cloudConsoleUrl(key) };
}

export async function uploadFileFromDisk(
  localFilePath: string,
  objectPath: string,
  opts?: { makePublic?: boolean; contentType?: string }
): Promise<{ gsUri: string; url?: string; consoleUrl?: string }> {
  if (!fs.existsSync(localFilePath)) {
    throw new Error(`❌ Archivo local no encontrado: ${localFilePath}`);
  }
  const buf = fs.readFileSync(localFilePath);
  const ct = opts?.contentType || detectContentTypeByExt(localFilePath);
  return uploadBuffer(objectPath, buf, ct, opts?.makePublic);
}

export async function uploadJson(objectPath: string, data: unknown) {
  const json = Buffer.from(JSON.stringify(data, null, 2));
  return uploadBuffer(objectPath, json, "application/json");
}

/* =========================
 *  LECTURA
 * ========================= */

export async function readBuffer(objectPath: string): Promise<Buffer> {
  const b = ensureBucket();
  const key = withPrefix(objectPath);
  const [buf] = await b.file(key).download();
  return buf;
}

export async function readJson<T = any>(objectPath: string): Promise<T> {
  const buf = await readBuffer(objectPath);
  return JSON.parse(buf.toString("utf-8")) as T;
}

/* =========================
 *  URLS (firmadas o públicas)
 * ========================= */

export async function getSignedReadUrl(objectPath: string, minutes = 60) {
  const b = ensureBucket();
  const key = withPrefix(objectPath);
  const [url] = await b.file(key).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + minutes * 60 * 1000,
  } as GetSignedUrlConfig);
  return url;
}

/**
 * Devuelve una URL lista para usar en <img src> o fetch:
 * - Si el bucket es público → devuelve pública (direct o console según CFG.URL_STYLE)
 * - Si es privado → devuelve URL firmada v4 (dominio storage.googleapis.com)
 */
export async function ensureReadUrl(objectPath: string, minutes = 60) {
  if (isPublic) {
    return publicObjectUrl(objectPath);
  }
  return getSignedReadUrl(objectPath, minutes);
}

/* =========================
 *  LISTADOS (para historial)
 * ========================= */

function isImageKey(name: string) {
  return /\.(png|jpe?g|webp|gif|avif)$/i.test(name);
}
function isJsonKey(name: string) {
  return /\.json$/i.test(name);
}

export type GcsFileInfo = {
  name: string;
  size?: number;
  updated?: string;
  contentType?: string;
  url?: string;
  consoleUrl?: string;
};

export async function listPrefixes(prefix: string): Promise<string[]> {
  const b = ensureBucket();
  const pfx = withPrefix(prefix).replace(/^\/+/, "").replace(/\/?$/, "/");
  const [, , apiResponse] = (await b.getFiles({
    prefix: pfx,
    delimiter: "/",
  })) as any;
  const prefixes: string[] = (apiResponse as any)?.prefixes ?? [];
  return Array.isArray(prefixes) ? prefixes : [];
}

export async function listEmailV2BatchIds(): Promise<string[]> {
  const prefixes = await listPrefixes("emails_v2/");
  return prefixes
    .map((full) => String(full || "").replace(/\/$/, ""))
    .map((full) => full.split("/").slice(-1)[0])
    .filter(Boolean)
    .sort()
    .reverse();
}

export async function listFilesByPrefix(prefix: string, minutes = 60): Promise<GcsFileInfo[]> {
  const b = ensureBucket();
  const pfx = withPrefix(prefix).replace(/^\/+/, "");
  const [files] = await b.getFiles({ prefix: pfx });
  const infos = await Promise.all(
    files.map(async (f) => {
      const name = f.name;
      const meta = f.metadata || {};
      let url: string | undefined = undefined;
      try {
        url = await ensureReadUrl(name, minutes);
      } catch {
        url = undefined;
      }
      return {
        name,
        size: Number(meta.size || 0),
        updated: (meta as any)?.updated || (meta as any)?.timeUpdated,
        contentType: (meta as any)?.contentType,
        url,
        consoleUrl: cloudConsoleUrl(name),
      } as GcsFileInfo;
    })
  );
  return infos;
}

export async function listFilesByBatch(batchId: string, minutes = 60): Promise<{
  prefix: string;
  files: GcsFileInfo[];
  images: GcsFileInfo[];
  jsons: GcsFileInfo[];
}> {
  const prefix = `emails_v2/${batchId}/`;
  const files = await listFilesByPrefix(prefix, minutes);
  const images = files.filter((f) => isImageKey(f.name));
  const jsons = files.filter((f) => isJsonKey(f.name));
  return { prefix: withPrefix(prefix), files, images, jsons };
}

export async function objectExists(objectPath: string): Promise<boolean> {
  try {
    const b = ensureBucket();
    const key = withPrefix(objectPath);
    const [exists] = await b.file(key).exists();
    return !!exists;
  } catch {
    return false;
  }
}

export async function getObjectUpdatedAtMs(objectPath: string): Promise<number> {
  try {
    const b = ensureBucket();
    const key = withPrefix(objectPath);
    const [meta] = await b.file(key).getMetadata();
    const updatedStr =
      (meta as any)?.updated ??
      (meta as any)?.timeUpdated ??
      (meta as any)?.metadata?.updated ??
      null;
    if (typeof updatedStr === "string" && updatedStr.length > 0) {
      const ms = Date.parse(updatedStr);
      return Number.isNaN(ms) ? 0 : ms;
    }
    return 0;
  } catch {
    return 0;
  }
}
