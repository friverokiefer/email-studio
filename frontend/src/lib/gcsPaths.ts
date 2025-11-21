const VITE_GCS_BUCKET = (import.meta as any).env?.VITE_GCS_BUCKET || "";
const VITE_GCS_PREFIX = (import.meta as any).env?.VITE_GCS_PREFIX || "dev";

export function pathJoinAndEncode(...parts: (string | undefined | null)[]) {
  const segs: string[] = [];
  for (const p of parts) {
    if (!p) continue;
    const trimmed = String(p).replace(/^\/+|\/+$/g, "");
    if (!trimmed) continue;
    for (const s of trimmed.split("/")) {
      if (!s) continue;
      segs.push(encodeURIComponent(s));
    }
  }
  return segs.join("/");
}

export function gcsDirectObjectUrl(batchId: string, fileName: string) {
  if (!VITE_GCS_BUCKET) return null;
  const path = pathJoinAndEncode(VITE_GCS_PREFIX, "emails_v2", batchId, fileName);
  return `https://storage.googleapis.com/${VITE_GCS_BUCKET}/${path}`;
}

// 👇 ESTOS ERAN LOS QUE FALTABAN
export function gcsBatchJsonUrl(batchId: string) {
  return gcsDirectObjectUrl(batchId, "batch.json");
}

export function gcsManifestUrl(batchId: string) {
  return gcsDirectObjectUrl(batchId, "_manifest.json");
}