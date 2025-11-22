// backend/src/services/gcpStorage.ts

import "dotenv/config";
import fs from "fs";
import path from "path";
import { Storage, GetSignedUrlConfig } from "@google-cloud/storage";

/* =========================
 * CONFIGURACIÓN Y AUTH
 * ========================= */
const {
  GCP_PROJECT_ID,
  GCP_BUCKET_NAME,
  GCP_PREFIX = "dev",
  GCP_PUBLIC_READ = "false",
  GCP_URL_STYLE = "direct",
} = process.env;

// Detección simple y robusta de credenciales
const localKeyPath = path.resolve(process.cwd(), ".secrets", "service-account.json");
const hasLocalKey = fs.existsSync(localKeyPath);

const storageOptions: any = {};

if (hasLocalKey) {
  // Entorno LOCAL: usamos archivo
  storageOptions.keyFilename = localKeyPath;
  if (GCP_PROJECT_ID) storageOptions.projectId = GCP_PROJECT_ID;
} else {
  // Entorno CLOUD RUN: usamos credenciales automáticas (ADC)
  if (GCP_PROJECT_ID) storageOptions.projectId = GCP_PROJECT_ID;
}

const storage = new Storage(storageOptions);

// Inicialización del bucket (lazy warning)
if (GCP_BUCKET_NAME) {
  // Instanciamos para uso interno
  const _b = storage.bucket(GCP_BUCKET_NAME);
} else {
  console.warn(
    "⚠️ GCP_BUCKET_NAME no definido. Funcionalidades de almacenamiento fallarán."
  );
}

const isPublic = GCP_PUBLIC_READ === "true";
const urlStyle = ((GCP_URL_STYLE || "direct").toLowerCase() === "console"
  ? "console"
  : "direct") as "direct" | "console";

/** Helper interno para asegurar que tenemos bucket */
function ensureBucket() {
  if (!GCP_BUCKET_NAME) {
    throw new Error("Falta GCP_BUCKET_NAME en variables de entorno.");
  }
  return storage.bucket(GCP_BUCKET_NAME);
}

// EXPORT 1: Configuración pública (necesario para generated.ts)
export const CFG = {
  PROJECT_ID: GCP_PROJECT_ID || "",
  BUCKET: GCP_BUCKET_NAME || "",
  PREFIX: String(GCP_PREFIX || "dev"),
  PUBLIC_READ: isPublic,
  URL_STYLE: urlStyle,
};

/* =========================
 * HELPERS DE RUTA Y URLS
 * ========================= */

function normalizeKey(p: string) {
  return String(p).replace(/^\/+/, "").replace(/\\/g, "/");
}

export function withPrefix(relativeKey: string): string {
  const normalized = normalizeKey(relativeKey);
  const prefix = `${String(GCP_PREFIX).replace(/^\/+|\/+$/g, "")}/`;
  return normalized.startsWith(prefix) ? normalized : `${prefix}${normalized}`;
}

export function publicDirectUrl(objectPath: string): string {
  const key = normalizeKey(withPrefix(objectPath));
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `https://storage.googleapis.com/${GCP_BUCKET_NAME}/${encoded}`;
}

export function publicConsoleUrl(objectPath: string): string {
  const key = normalizeKey(withPrefix(objectPath));
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `https://storage.cloud.google.com/${GCP_BUCKET_NAME}/${encoded}`;
}

export function publicObjectUrl(objectPath: string): string {
  return urlStyle === "console"
    ? publicConsoleUrl(objectPath)
    : publicDirectUrl(objectPath);
}

export function cloudConsoleUrl(objectPath: string): string {
  const keyWithPrefix = withPrefix(objectPath).replace(/^\/+/, "");
  const encoded = keyWithPrefix.split("/").map(encodeURIComponent).join("/");
  const proj = encodeURIComponent(String(GCP_PROJECT_ID || ""));
  return `https://console.cloud.google.com/storage/browser/_details/${GCP_BUCKET_NAME}/${encoded}?project=${proj}`;
}

export function toGsUri(objectPath: string): string {
  return `gs://${GCP_BUCKET_NAME}/${normalizeKey(withPrefix(objectPath))}`;
}

// EXPORT 2: Alias legacy (necesario para generateEmailV2.ts)
export const cloudBrowserUrl = publicConsoleUrl;

/* =========================
 * MIME TYPES
 * ========================= */
export function detectContentTypeByExt(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".webp": return "image/webp";
    case ".gif": return "image/gif";
    case ".svg": return "image/svg+xml";
    case ".json": return "application/json";
    case ".html": return "text/html; charset=utf-8";
    case ".txt": return "text/plain; charset=utf-8";
    case ".csv": return "text/csv; charset=utf-8";
    case ".pdf": return "application/pdf";
    case ".mp4": return "video/mp4";
    default: return "application/octet-stream";
  }
}

/* =========================
 * SUBIDAS
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
      return {
        gsUri: toGsUri(key),
        url: publicObjectUrl(key),
        consoleUrl: cloudConsoleUrl(key),
      };
    } catch (err: any) {
      console.warn("[GCS] No se pudo hacer público el objeto:", err.message);
    }
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
 * LECTURA
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
      meta.updated || (meta as any).timeUpdated || (meta.metadata as any)?.updated;
    
    if (updatedStr) {
      const ms = Date.parse(updatedStr);
      return Number.isNaN(ms) ? 0 : ms;
    }
    return 0;
  } catch {
    return 0;
  }
}

/* =========================
 * URLS FIRMADAS
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

export async function ensureReadUrl(objectPath: string, minutes = 60) {
  if (isPublic) {
    return publicObjectUrl(objectPath);
  }
  return getSignedReadUrl(objectPath, minutes);
}

/* =========================
 * LISTADOS
 * ========================= */

export async function listPrefixes(prefix: string): Promise<string[]> {
  const b = ensureBucket();
  const pfx = withPrefix(prefix).replace(/^\/+/, "").replace(/\/?$/, "/");
  
  const [, , apiResponse] = (await b.getFiles({
    prefix: pfx,
    delimiter: "/",
    autoPaginate: false,
  })) as any;
  
  const prefixes: string[] = apiResponse?.prefixes || [];
  return Array.isArray(prefixes) ? prefixes : [];
}

export async function listEmailV2BatchIds(): Promise<string[]> {
  const prefixes = await listPrefixes("emails_v2/");
  return prefixes
    .map((full) => String(full || "").replace(/\/$/, "")) 
    .map((full) => full.split("/").pop()) 
    .filter((id): id is string => !!id)
    .sort()
    .reverse();
}

export type GcsFileInfo = {
  name: string;
  size?: number;
  updated?: string;
  contentType?: string;
  url?: string;
  consoleUrl?: string;
};

export async function listFilesByPrefix(prefix: string, minutes = 60): Promise<GcsFileInfo[]> {
  const b = ensureBucket();
  const pfx = withPrefix(prefix).replace(/^\/+/, "");
  const [files] = await b.getFiles({ prefix: pfx });
  
  const infos = await Promise.all(
    files.map(async (f) => {
      const name = f.name;
      const meta = f.metadata || {};
      let url: string | undefined;
      try {
        url = await ensureReadUrl(name, minutes);
      } catch { /* ignore */ }
      
      return {
        name,
        size: Number(meta.size || 0),
        updated: meta.updated,
        contentType: meta.contentType,
        url,
        consoleUrl: cloudConsoleUrl(name),
      } as GcsFileInfo;
    })
  );
  return infos;
}

function isImageKey(name: string) {
  return /\.(png|jpe?g|webp|gif|avif)$/i.test(name);
}
function isJsonKey(name: string) {
  return /\.json$/i.test(name);
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
