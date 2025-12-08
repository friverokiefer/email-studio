// frontend/src/lib/schemas.ts

import type { SfmcDraftEmailPayload } from "./apiEmailV2";

/**
 * ==================== Metadata del IA Engine ====================
 * Tipos para el catálogo dinámico de campañas y clusters.
 */
export interface CampaignOption {
  id: string;
  label: string;
  description?: string;
}

export interface ClusterOption {
  id: string;
  label: string;
  description?: string;
  tone_hint?: string;
}

export interface MetaData {
  // Los marcamos como opcionales (?) para que el frontend no explote
  // si el backend omite alguna llave o envía null.
  campaigns?: CampaignOption[];
  clusters?: ClusterOption[];
  mapping?: Record<string, string[]>; // campaña_id -> lista de cluster_ids
  defaults?: { 
    benefits: Record<string, string[]>;
    ctas: Record<string, string[]>;
    subjects: Record<string, string[]>;
    clusterTone: Record<string, string>;
  };
}

/**
 * Tipos genéricos de campos (Se mantienen sin cambios)
 */
export type Field =
  | {
      id: string;
      label: string;
      type: "text" | "url";
      required?: boolean;
      maxLength?: number;
      placeholder?: string;
    }
  | {
      id: string;
      label: string;
      type: "textarea";
      required?: boolean;
      maxLength?: number;
      placeholder?: string;
    }
  | {
      id: string;
      label: string;
      type: "select" | "radio";
      required?: boolean;
      options: string[];
    }
  | {
      id: string;
      label: string;
      type: "multiselect";
      required?: boolean;
      options: string[];
    }
  | {
      id: string;
      label: string;
      type: "number";
      required?: boolean;
      min?: number;
      max?: number;
    };

export type Schema = {
  id: string;
  title: string;
  fields: Field[];
  image_formats?: any[];
  output_contract?: Record<string, any>;
};

/**
 * ==================== Validador SFMC payload (Se mantiene sin cambios) ====================
 */
export function validateSfmcDraftEmailPayload(
  p: SfmcDraftEmailPayload | any
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const isNonEmpty = (s: any) => typeof s === "string" && s.trim().length > 0;

  // categoryId
  if (typeof p?.categoryId !== "number" || !Number.isFinite(p.categoryId)) {
    errors.push("categoryId debe ser number");
  }

  // image
  const img = p?.image as SfmcDraftEmailPayload["image"] | undefined;
  if (!img || typeof img !== "object") {
    errors.push("image es requerido");
  } else {
    if (!isNonEmpty(img.name)) errors.push("image.name es requerido");

    if (
      !["png", "jpg", "jpeg", "gif"].includes(
        String(img.extension).toLowerCase()
      )
    ) {
      errors.push("image.extension inválido (png|jpg|jpeg|gif)");
    }

    if (!isNonEmpty((img as any).base64) && !isNonEmpty((img as any).gcsUrl)) {
      errors.push("image.base64 o image.gcsUrl es requerido");
    }
  }

  // email
  const em = p?.email as SfmcDraftEmailPayload["email"] | undefined;
  if (!em || typeof em !== "object") {
    errors.push("email es requerido");
  } else {
    if (!isNonEmpty(em.name)) errors.push("email.name es requerido");
    if (!isNonEmpty(em.subject)) errors.push("email.subject es requerido");
    if (!isNonEmpty(em.htmlTemplate)) {
      errors.push("email.htmlTemplate es requerido");
    }
  }

  return { ok: errors.length === 0, errors };
}