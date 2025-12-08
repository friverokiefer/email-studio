// frontend/src/hooks/useSidebarForm.ts
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
// NOTA: No importamos fetchJson para hacer el bypass y depurar a bajo nivel
// import { fetchJson } from "@/lib/api"; 
import { loadFormState, saveFormState } from "@/lib/storage";
import type { MetaData, CampaignOption, ClusterOption } from "@/lib/schemas";

export type Email2SidebarState = {
  campaign: string;
  cluster: string;
  feedbackSubject: string;
  feedbackPreheader: string;
  feedbackBody: string;
  setCount: number;
  imageCount: number;
};

const FORM_TYPE = "email_v2";

export function useSidebarForm() {
  const [state, setState] = useState<Email2SidebarState>({
    campaign: "",
    cluster: "",
    feedbackSubject: "",
    feedbackPreheader: "",
    feedbackBody: "",
    setCount: 3,
    imageCount: 2,
  });

  const [meta, setMeta] = useState<MetaData | null>(null);
  const [metaLoading, setMetaLoading] = useState<boolean>(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  // 1. Cargar persistencia local al iniciar
  useEffect(() => {
    try {
      const stored = loadFormState<Email2SidebarState>(FORM_TYPE);
      if (stored) {
        if (typeof stored.setCount === "number")
          stored.setCount = Math.max(1, Math.min(5, stored.setCount));
        if (typeof stored.imageCount === "number")
          stored.imageCount = Math.max(1, Math.min(5, stored.imageCount));
        setState((prev) => ({ ...prev, ...stored }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  // 2. Guardar cambios automáticamente
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        saveFormState(FORM_TYPE, state);
      } catch {
        /* ignore */
      }
    }, 500);
    return () => clearTimeout(id);
  }, [state]);

  // 3. Cargar Catálogo (BYPASS MANUAL: Fetch Nativo + Cache Buster)
  useEffect(() => {
    let cancelled = false;

    const loadMetaBypassingApi = async () => {
      setMetaLoading(true);
      
      // TRUCO: Usamos /api explícito basado en tus curls exitosos.
      // Añadimos 'nocache' con timestamp para forzar status 200 y evitar el 304.
      const endpoint = "/api/email-v2/meta"; 
      const url = `${endpoint}?nocache=${Date.now()}`;

      console.log(`🚀 [useSidebarForm] Iniciando Fetch Nativo a: ${url}`);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const rawData = await response.json();

        if (!cancelled) {
          // === ZONA DE DIAGNÓSTICO Y NORMALIZACIÓN ===
          console.group("✅ [useSidebarForm] RESPUESTA RECIBIDA");
          console.log("Raw Payload:", rawData);

          let cleanData: MetaData = { campaigns: [], clusters: [], mapping: {} };

          // Detector de estructura
          if (rawData && Array.isArray(rawData.campaigns)) {
            console.log("-> Estructura Directa detectada.");
            cleanData = rawData;
          } else if (rawData && rawData.data && Array.isArray(rawData.data.campaigns)) {
            console.log("-> Estructura 'data' Wrapper detectada.");
            cleanData = rawData.data;
          } else if (rawData && rawData.payload && Array.isArray(rawData.payload.campaigns)) {
             console.log("-> Estructura 'payload' Wrapper detectada.");
             cleanData = rawData.payload;
          } else {
             console.error("❌ Estructura desconocida o vacía:", rawData);
          }
          console.groupEnd();

          // Guardamos data
          setMeta(cleanData);

          // Verificación final para UI
          if (!cleanData.campaigns || cleanData.campaigns.length === 0) {
            setMetaError("Se recibieron datos pero la lista de campañas está vacía.");
          } else {
            setMetaError(null);
          }
        }

      } catch (e: any) {
        console.error("💥 [useSidebarForm] Error Fatal en Fetch:", e);
        if (!cancelled) {
          // Fallback: Si falla con /api, intenta sin /api (por si el proxy vite es distinto)
          if (url.includes("/api/")) {
             console.log("🔄 Reintentando sin prefijo /api ...");
             // Podríamos reintentar aquí, pero mejor mostramos el error para depurar.
          }
          setMetaError("Error conectando al servidor IA.");
          toast.error("Error cargando metadatos.");
        }
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    };

    loadMetaBypassingApi();

    return () => {
      cancelled = true;
    };
  }, []);

  // 4. Validación defensiva: Limpiar selección inválida
  useEffect(() => {
    // Si no hay campañas cargadas, no hacemos nada
    if (!meta?.campaigns || !Array.isArray(meta.campaigns)) return;

    setState((prev) => {
      let nextCamp = prev.campaign;

      // A. Validar Campaña
      const campExists = meta.campaigns?.some((c) => c.id === nextCamp);
      
      if (nextCamp && !campExists) {
        nextCamp = "";
      }

      // B. Validar Cluster
      let nextClust = prev.cluster;
      if (nextCamp) {
        const allowedIds = meta.mapping?.[nextCamp] || [];
        if (allowedIds.length > 0 && nextClust && !allowedIds.includes(nextClust)) {
          nextClust = "";
        }
      } else {
        nextClust = "";
      }

      if (nextCamp === prev.campaign && nextClust === prev.cluster) return prev;
      return { ...prev, campaign: nextCamp, cluster: nextClust };
    });
  }, [meta]);

  // 5. Helpers UI
  const availableCampaigns: CampaignOption[] = useMemo(() => {
    if (!meta?.campaigns || !Array.isArray(meta.campaigns)) return [];
    return meta.campaigns;
  }, [meta]);

  const availableClusters: ClusterOption[] = useMemo(() => {
    if (!state.campaign || !meta?.clusters || !Array.isArray(meta.clusters)) return [];

    const allowedIds = meta.mapping?.[state.campaign];

    if (Array.isArray(allowedIds) && allowedIds.length > 0) {
      return meta.clusters.filter((c) => allowedIds.includes(c.id));
    }

    return [];
  }, [state.campaign, meta]);

  return {
    state,
    setState,
    meta,
    metaLoading,
    metaError,
    availableCampaigns,
    availableClusters,
  };
}