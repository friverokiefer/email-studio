// backend/src/services/historyIndex.ts

import { readJson, uploadJson, objectExists } from "./gcpStorage";

const INDEX_KEY = "history_index.json";

export type HistoryItem = {
  batchId: string;
  count: number;
  createdAt?: string;
};

/**
 * Lee el índice maestro de historial.
 * Retorna array vacío si no existe o falla.
 */
export async function getHistoryIndex(): Promise<HistoryItem[]> {
  try {
    if (await objectExists(INDEX_KEY)) {
      const data = await readJson<HistoryItem[]>(INDEX_KEY);
      return Array.isArray(data) ? data : [];
    }
  } catch (e) {
    console.warn("[historyIndex] Error leyendo índice (usaremos fallback):", e);
  }
  return [];
}

/**
 * Agrega (o actualiza) un item al inicio del historial y guarda el archivo.
 * Usa "no-cache" para el archivo de índice para evitar stale data.
 */
export async function addToHistoryIndex(item: HistoryItem): Promise<void> {
  try {
    const current = await getHistoryIndex();
    
    // Filtramos si ya existe para evitar duplicados (update scenario)
    const filtered = current.filter((i) => i.batchId !== item.batchId);
    
    // Agregamos al principio (unshift)
    filtered.unshift(item);
    
    // Guardamos en GCS forzando que NO se cachee el JSON de índice
    // (para que el listado refresque rápido en otros clientes)
    await uploadJson(INDEX_KEY, filtered, "no-cache, no-store, must-revalidate");
    
    // console.log(`[historyIndex] Agregado batch ${item.batchId} al índice.`);
  } catch (e) {
    console.error("[historyIndex] Error actualizando índice:", e);
    // No lanzamos error para no interrumpir el flujo principal de generación
  }
}