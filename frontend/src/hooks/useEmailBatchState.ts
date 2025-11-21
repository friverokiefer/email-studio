// frontend/src/hooks/useEmailBatchState.ts
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { API_BASE as API_V2_BASE } from "@/lib/api";
import type { EmailContentSet, PreviewData } from "@/components/Email2Workspace";
import type { EmailV2Image } from "@/lib/apiEmailV2";

export function useEmailBatchState() {
  const [batchId, setBatchId] = useState<string>("");
  const [contentSets, setContentSets] = useState<EmailContentSet[]>([]);
  const [images, setImages] = useState<EmailV2Image[]>([]);
  const [livePreview, setLivePreview] = useState<PreviewData | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [savedVisible, setSavedVisible] = useState(false);

  // Referencia mutable para ediciones sin re-render excesivo
  const editedRef = useRef<EmailContentSet[] | null>(null);
  
  // Timers de feedback visual
  const hideSavedRef = useRef<number | undefined>(undefined);
  const clearSavedRef = useRef<number | undefined>(undefined);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (hideSavedRef.current) window.clearTimeout(hideSavedRef.current);
      if (clearSavedRef.current) window.clearTimeout(clearSavedRef.current);
    };
  }, []);

  // Manejador: Recepción de datos desde la IA (Sidebar)
  function handleGenerated(resp: any) {
    const sets: EmailContentSet[] = resp?.sets || resp?.trios || [];
    const imgs: EmailV2Image[] = resp?.images || [];

    setBatchId(resp.batchId || "");
    setContentSets(sets);
    setImages(imgs);
    setLivePreview(null);
    setLastSavedAt(null);
    setSavedVisible(false);
    editedRef.current = null;
  }

  // Manejador: Edición en Workspace
  function handleEditedChange(next: EmailContentSet[]) {
    editedRef.current = next;
  }

  // Acción: Guardar cambios en Backend
  async function saveEdits() {
    if (!batchId) return;
    setIsSaving(true);
    try {
      const effectiveSets =
        editedRef.current && editedRef.current.length
          ? editedRef.current
          : contentSets;

      const payload = { sets: effectiveSets };

      const res = await fetch(
        `${API_V2_BASE}/api/emails-v2/${encodeURIComponent(batchId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Error guardando Email 2.0");
      }

      // Feedback visual
      const now = new Date().toLocaleTimeString();
      setLastSavedAt(now);

      if (hideSavedRef.current) window.clearTimeout(hideSavedRef.current);
      if (clearSavedRef.current) window.clearTimeout(clearSavedRef.current);
      
      setSavedVisible(true);
      hideSavedRef.current = window.setTimeout(() => setSavedVisible(false), 2800);
      clearSavedRef.current = window.setTimeout(() => setLastSavedAt(null), 3600);

      // Sincronizar estado con lo guardado
      if (editedRef.current) setContentSets(editedRef.current);
      toast.success("Ediciones guardadas correctamente.");
    } catch (e: any) {
      toast.error(e?.message || "Error al guardar.");
      throw e; // Re-throw para que quien llame sepa que falló
    } finally {
      setIsSaving(false);
    }
  }

  return {
    // State
    batchId,
    contentSets,
    images,
    livePreview,
    isSaving,
    lastSavedAt,
    savedVisible,
    editedRef,
    // Setters
    setLivePreview,
    // Actions
    handleGenerated,
    handleEditedChange,
    saveEdits,
  };
}