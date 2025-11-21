import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { getEmailV2Meta, type EmailV2Meta } from "@/lib/apiEmailV2";
import { loadFormState, saveFormState } from "@/lib/storage";

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

  const [meta, setMeta] = useState<EmailV2Meta | null>(null);
  const [metaLoading, setMetaLoading] = useState<boolean>(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  // 1. Cargar persistencia local al iniciar
  useEffect(() => {
    try {
      const stored = loadFormState<Email2SidebarState>(FORM_TYPE);
      if (stored) {
        // Asegurar rangos válidos (1-5)
        if (typeof stored.setCount === "number") stored.setCount = Math.max(1, Math.min(5, stored.setCount));
        if (typeof stored.imageCount === "number") stored.imageCount = Math.max(1, Math.min(5, stored.imageCount));
        setState((prev) => ({ ...prev, ...stored }));
      }
    } catch { /* ignore */ }
  }, []);

  // 2. Guardar cambios automáticamente (con debounce)
  useEffect(() => {
    const id = window.setTimeout(() => {
      try { saveFormState(FORM_TYPE, state); } catch { /* ignore */ }
    }, 500);
    return () => clearTimeout(id);
  }, [state]);

  // 3. Cargar Catálogo desde IA Engine
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setMetaLoading(true);
        const data = await getEmailV2Meta();
        if (!cancelled) {
          setMeta(data);
          setMetaError(null);
        }
      } catch (e) {
        console.error("Error meta:", e);
        if (!cancelled) {
          setMetaError("Error cargando catálogo.");
          toast.error("No se pudo cargar el catálogo de campañas.");
        }
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 4. VALIDACIÓN ESTRICTA: Si la campaña guardada ya no existe, resetearla.
  useEffect(() => {
    if (!meta) return;
    
    const validCampaigns = meta.campaigns ?? [];
    
    setState((prev) => {
      // A. Validar Campaña
      let nextCamp = prev.campaign;
      if (nextCamp && !validCampaigns.includes(nextCamp)) {
        // Campaña no existe en el catálogo actual -> Reset
        nextCamp = ""; 
      }

      // B. Validar Cluster (debe pertenecer a la campaña)
      let nextClust = prev.cluster;
      if (nextCamp) {
        const validClusters = meta.campaignClusters?.[nextCamp] ?? [];
        if (nextClust && !validClusters.includes(nextClust)) {
           nextClust = "";
        }
      } else {
        nextClust = "";
      }

      if (nextCamp === prev.campaign && nextClust === prev.cluster) return prev;
      return { ...prev, campaign: nextCamp, cluster: nextClust };
    });
  }, [meta]);

  const availableCampaigns = useMemo(() => meta?.campaigns ?? [], [meta]);
  const availableClusters = useMemo(() => {
    if (!state.campaign || !meta) return [];
    return meta.campaignClusters?.[state.campaign] ?? [];
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