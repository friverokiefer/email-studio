// backend/src/utils/constants.ts

/** =========================
 * Catálogos principales
 * ========================= */
export const CAMPAIGNS = [
  "Crédito de consumo - Persona",
  "Crédito de consumo - Empresa",
  "DAP (Depósito a plazo)",
  "Crédito hipotecario",
  "Refinanciar deuda",
  "Apertura producto - Cuenta corriente",
  "Apertura producto - Tarjeta de crédito",
  "Seguros",
] as const;

export type Campaign = (typeof CAMPAIGNS)[number];

// --- Definición de Arrays de Clusters ---

const CONSUMO_PERSONA_CLUSTERS = [
  "Auto familiar",
  "Auto soltero",
  "Cambio de moto",
  "Mejora del hogar",
  "Proyectos familiares",
  "Proyectos personales",
  "Reorganizar finanzas joven",
  "Reorganizar finanzas senior",
  "Viajes familiares",
  "Viajes solteros",
] as const;

// ACTUALIZADO: Nuevos Clusters Empresa
const CONSUMO_EMPRESA_CLUSTERS = [
  "Liquidez Operativa",
  "Inversión para Crecer",
  "Reordenamiento Financiero",
] as const;

const DAP_CLUSTERS = [
  "Ahorro objetivo",
  "Fondo de emergencia",
  "Inversión conservadora",
  "Plan de corto plazo",
  "Plan de largo plazo",
] as const;

const HIPOTECARIO_CLUSTERS = [
  "Primera vivienda",
  "Mejora de vivienda actual",
  "Inversión inmobiliaria",
  "Refinanciar hipotecario",
] as const;

const REFINANCIAR_DEUDA_CLUSTERS = [
  "Consolidar deudas consumo",
  "Bajar dividendo hipotecario",
  "Reorganizar tarjetas de crédito",
  "Ordenar líneas y sobregiros",
] as const;

// ACTUALIZADO: Nuevos Clusters Cuenta Corriente
const CC_CLUSTERS = [
  "Cuenta digital GO BICE",
  "Cuenta corriente Universitaria",
  "Cuenta para PyME",
  "Cuenta alta renta",
  "Cuenta para profesional independiente",
] as const;

const TC_CLUSTERS = [
  "Viajes internacionales",
  "Compras diarias",
  "Compras online",
  "Segmento alta renta",
] as const;

const SEGUROS_CLUSTERS = [
  "Seguro de auto",
  "Seguro de vida",
  "Seguro de hogar",
  "Seguro de viaje",
  "Seguro de salud",
] as const;

export const CAMPAIGN_CLUSTERS: Record<Campaign, string[]> = {
  "Crédito de consumo - Persona": [...CONSUMO_PERSONA_CLUSTERS],
  "Crédito de consumo - Empresa": [...CONSUMO_EMPRESA_CLUSTERS],
  "DAP (Depósito a plazo)": [...DAP_CLUSTERS],
  "Crédito hipotecario": [...HIPOTECARIO_CLUSTERS],
  "Refinanciar deuda": [...REFINANCIAR_DEUDA_CLUSTERS],
  "Apertura producto - Cuenta corriente": [...CC_CLUSTERS],
  "Apertura producto - Tarjeta de crédito": [...TC_CLUSTERS],
  "Seguros": [...SEGUROS_CLUSTERS],
};

/**
 * Lista plana de clusters posibles.
 */
export const CLUSTERS: string[] = Array.from(
  new Set<string>(Object.values(CAMPAIGN_CLUSTERS).flat()),
);

export type Cluster = (typeof CLUSTERS)[number];

// --- Helpers Legacy ---

export function getClustersForCampaign(campaign: Campaign): string[] {
  return CAMPAIGN_CLUSTERS[campaign] ?? [];
}

export function getCampaignsForCluster(cluster: string): Campaign[] {
  const value = String(cluster);
  return (CAMPAIGNS as readonly Campaign[]).filter((c) =>
    (CAMPAIGN_CLUSTERS[c] ?? []).includes(value),
  );
}

export function genericSubjectsFor(campaign: Campaign) {
  return [
    `${campaign}: solución a tu medida`,
    `${campaign} con proceso 100% online`,
    `${campaign}: asesoría experta y transparente`,
    `${campaign} rápido y claro`,
    `${campaign}: condiciones competitivas`,
  ];
}