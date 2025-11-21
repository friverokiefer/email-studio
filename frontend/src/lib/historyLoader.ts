import { API_BASE } from "@/lib/api";
import { gcsDirectObjectUrl, gcsBatchJsonUrl, gcsManifestUrl } from "@/lib/gcsPaths";
import type { GenerateV2Response } from "@/lib/apiEmailV2";

const VITE_GCS_BUCKET = (import.meta as any).env?.VITE_GCS_BUCKET || "";

/** Reconstruye heroUrl estables a partir de fileName o heroUrl relativos */
function normalizeImagesFromGCS(json: any, batchId: string) {
  if (!json || !VITE_GCS_BUCKET) return json;
  const src: any[] = Array.isArray(json.images) ? json.images : [];

  json.images = src.map((img: any) => {
    const fileName =
      String(img?.fileName || img?.url || "").replace(/^\/+/, "") ||
      (typeof img?.heroUrl === "string"
        ? img.heroUrl.match(/\/emails_v2\/[^/]+\/(.+?)(?:\?|$)/)?.[1] || ""
        : "");
    if (!fileName) return img;

    const url = gcsDirectObjectUrl(batchId, fileName);
    return { ...img, fileName, heroUrl: url || img?.heroUrl || "" };
  });

  return json;
}

/** Intenta hidratar imágenes desde _manifest.json cuando batch.json no las trae */
async function hydrateFromManifest(batchId: string, baseJson: any) {
  try {
    const mUrl = gcsManifestUrl(batchId);
    if (!mUrl) return baseJson; // Si no hay bucket configurado
    
    const res = await fetch(`${mUrl}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const manifest = await res.json();
    const imgs = Array.isArray(manifest?.images) ? manifest.images : [];
    if (imgs.length === 0) return baseJson;

    const images = imgs.map((m: any) => {
      const fileName = String(m?.fileName || "").replace(/^\/+/, "");
      const heroUrl = gcsDirectObjectUrl(batchId, fileName) || "";
      return {
        fileName,
        heroUrl,
        meta: {
          size: m?.sizeDeclared,
          sizeNormalized: m?.sizeNormalized,
        },
      };
    });

    return { ...baseJson, images };
  } catch {
    return baseJson;
  }
}

export function extractBatchId(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim();
  // Patrón 1: URL completa de carpeta
  const m1 = s.match(/\/emails_v2\/([^/]+)\//i);
  if (m1?.[1]) return decodeURIComponent(m1[1]);
  
  // Patrón 2: URL de batch.json
  const m2 = s.match(/\/emails_v2\/([^/]+)\/batch\.json/i);
  if (m2?.[1]) return decodeURIComponent(m2[1]);
  
  // Patrón 3: Timestamp simple (YYYY-MM-DD_HHMMSS)
  const m3 = s.match(/[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{6}/);
  if (m3?.[0]) return m3[0];
  
  // Patrón 4: ID limpio (si no tiene slashes y parece un ID)
  if (!s.includes("/") && s.length >= 8) return s;
  
  return null;
}

export async function loadHistoryBatch(batchId: string): Promise<GenerateV2Response> {
  const base = API_BASE || "";
  const backendUrl = `${base}/api/generated/emails_v2/${encodeURIComponent(batchId)}/batch.json?t=${Date.now()}`;
  
  let res = await fetch(backendUrl, { cache: "no-store" });

  // Fallback a GCS directo si el backend falla (o no está disponible)
  if (!res.ok) {
    if (!VITE_GCS_BUCKET) throw new Error(`Backend devolvió ${res.status}`);
    const gcsUrl = gcsBatchJsonUrl(batchId);
    if (!gcsUrl) throw new Error("No GCS URL generated");

    res = await fetch(`${gcsUrl}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`GCS devolvió ${res.status}`);
  }

  let json = await res.json();
  json = normalizeImagesFromGCS(json, batchId);
  
  // Si el JSON no tiene imágenes, intentar buscar en el manifest
  if (!Array.isArray(json.images) || json.images.length === 0) {
    json = await hydrateFromManifest(batchId, json);
  }

  // Compatibilidad con estructura antigua "trios" vs nueva "sets"
  const setsFromJson = (() => {
    if (Array.isArray(json.sets) && json.sets.length > 0) return json.sets;
    const legacyContent = (json as any)["trios"]; 
    if (Array.isArray(legacyContent) && legacyContent.length > 0) return legacyContent;
    return [];
  })();

  return {
    batchId: json.batchId || batchId,
    createdAt: json.createdAt,
    sets: setsFromJson,
    images: json.images || [],
  };
}