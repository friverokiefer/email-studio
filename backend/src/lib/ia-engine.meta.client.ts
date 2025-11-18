// backend/src/lib/ia-engine.meta.client.ts
import "dotenv/config";
import * as constants from "../utils/constants";
import { IA_ENGINE_BASE_URL, IA_ENGINE_ENABLED } from "../services/iaEngine";

/**
 * Cliente para obtener la metadata del IA Engine (Email V2):
 * campañas, clusters, mapping campaña→clusters, etc.
 */

export type IaEngineMeta = {
  campaigns: string[];
  clusters: string[];
  campaignClusters: Record<string, string[]>;
  // Campos extra que pueda exponer el IA Engine (no los usamos todos en el front)
  benefits?: Record<string, string[]>;
  ctas?: Record<string, string[]>;
  subjects?: Record<string, string[]>;
  clusterTone?: Record<string, string>;
};

/* ============================================================
 * Catálogos desde constants.ts (fallback estático)
 * ============================================================ */

const CAMPAIGNS: string[] = Array.isArray((constants as any).CAMPAIGNS)
  ? [...((constants as any).CAMPAIGNS as readonly string[])]
  : [];

const CLUSTERS: string[] = Array.isArray((constants as any).CLUSTERS)
  ? [...((constants as any).CLUSTERS as string[])]
  : [];

const RAW_CAMPAIGN_CLUSTERS: Record<string, string[]> | undefined =
  (constants as any).CAMPAIGN_CLUSTERS &&
  typeof (constants as any).CAMPAIGN_CLUSTERS === "object"
    ? ((constants as any).CAMPAIGN_CLUSTERS as Record<string, string[]>)
    : undefined;

/* ============================================================
 * Helper: fetch con timeout
 * ============================================================ */

async function fetchWithTimeout(
  resource: string,
  options: any = {},
  timeoutMs = 15000
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
    throw new Error(
      `IA Engine meta network/timeout error: ${err?.message || err}`
    );
  }
}

/* ============================================================
 * Meta desde IA Engine (Python)
 * ============================================================ */

async function fetchMetaFromIaEngine(): Promise<IaEngineMeta> {
  const url = `${IA_ENGINE_BASE_URL}/ia/meta`;

  console.log("\n====================================");
  console.log("[iaEngine.meta] GET →", url);
  console.log("====================================\n");

  const res = await fetchWithTimeout(
    url,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
    15000
  );

  if (!res.ok) {
    let text = "";
    try {
      text = await res.text();
    } catch (_) {
      // ignore
    }

    throw new Error(
      `IA Engine /ia/meta responded ${res.status}: ${
        text || res.statusText
      }`
    );
  }

  let raw: unknown;
  try {
    raw = await res.json();
  } catch (err) {
    throw new Error(`IA Engine /ia/meta JSON parse error: ${err}`);
  }

  const data = raw as Partial<IaEngineMeta>;

  if (!data || !Array.isArray(data.campaigns) || !Array.isArray(data.clusters)) {
    throw new Error(
      "IA Engine /ia/meta payload inválido (faltan campaigns/clusters)."
    );
  }

  const campaignClusters: Record<string, string[]> = {};
  if (data.campaignClusters && typeof data.campaignClusters === "object") {
    for (const [k, v] of Object.entries(data.campaignClusters)) {
      campaignClusters[String(k)] = Array.isArray(v)
        ? v.map((x) => String(x))
        : [];
    }
  }

  const meta: IaEngineMeta = {
    campaigns: data.campaigns.map((c) => String(c)),
    clusters: data.clusters.map((c) => String(c)),
    campaignClusters,
    benefits: data.benefits,
    ctas: data.ctas,
    subjects: data.subjects,
    clusterTone: data.clusterTone,
  };

  console.log("[iaEngine.meta] ✔️ Meta desde IA Engine:", {
    campaigns: meta.campaigns.length,
    clusters: meta.clusters.length,
  });

  return meta;
}

/* ============================================================
 * Fallback estático con constants.ts
 * ============================================================ */

function buildFallbackMeta(): IaEngineMeta {
  const campaigns = CAMPAIGNS.length ? [...CAMPAIGNS] : [];
  const clusters = CLUSTERS.length ? [...CLUSTERS] : [];

  const campaignClusters: Record<string, string[]> = {};

  if (RAW_CAMPAIGN_CLUSTERS && Object.keys(RAW_CAMPAIGN_CLUSTERS).length > 0) {
    // Tenemos mapa fino desde constants.ts
    for (const [campaign, list] of Object.entries(RAW_CAMPAIGN_CLUSTERS)) {
      campaignClusters[campaign] = Array.isArray(list) ? [...list] : [];
    }
  } else {
    // Fallback genérico: todas las campañas ven todos los clusters
    for (const c of campaigns) {
      campaignClusters[c] = [...clusters];
    }
  }

  console.log("[iaEngine.meta] ⚠️ Usando fallback estático de constants.ts");

  return { campaigns, clusters, campaignClusters };
}

/* ============================================================
 * Cache sencillo en memoria
 * ============================================================ */

let _metaCache: {
  data: IaEngineMeta | null;
  fetchedAt: number;
} = {
  data: null,
  fetchedAt: 0,
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/* ============================================================
 * API principal: getIaEngineMetaCached
 * ============================================================ */

export async function getIaEngineMetaCached(options?: {
  forceRefresh?: boolean;
}): Promise<IaEngineMeta> {
  const now = Date.now();
  const force = options?.forceRefresh === true;

  // Cache aún válido
  if (!force && _metaCache.data && now - _metaCache.fetchedAt < CACHE_TTL_MS) {
    return _metaCache.data;
  }

  // 1) Intentar IA Engine si está habilitado
  if (IA_ENGINE_ENABLED) {
    try {
      const meta = await fetchMetaFromIaEngine();
      _metaCache = {
        data: meta,
        fetchedAt: now,
      };
      return meta;
    } catch (err) {
      console.warn(
        "[iaEngine.meta] IA Engine no disponible, usando fallback estático:",
        err
      );
      // caemos a fallback
    }
  } else {
    console.log(
      "[iaEngine.meta] IA_ENGINE_ENABLED=0/false → usando meta estático (constants.ts)"
    );
  }

  // 2) Fallback estático desde constants.ts
  const fallback = buildFallbackMeta();
  _metaCache = {
    data: fallback,
    fetchedAt: now,
  };
  return fallback;
}
