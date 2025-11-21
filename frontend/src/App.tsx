// frontend/src/App.tsx
import React, { useState } from "react";
import "./styles/index.css";
import { toast } from "sonner";

// Hooks (Lógica de Negocio)
import { useEmailBatchState } from "@/hooks/useEmailBatchState";
import { useSfmcDraftSender } from "@/hooks/useSfmcDraftSender";

// Componentes de Layout
import { Email2Sidebar } from "@/components/Email2Sidebar";
import { Email2Workspace } from "@/components/Email2Workspace";
import { PreviewPanel } from "@/components/PreviewPanel";
import { ConfirmSendModal } from "@/components/ui/ConfirmSendModal";

export default function App() {
  // 1. Estado Principal del Batch (Sets, Imagenes, Guardado)
  const batchState = useEmailBatchState();
  
  // 2. Lógica de Envío a Salesforce
  const sfmcSender = useSfmcDraftSender();
  
  // 3. Estado local solo para UI (Modales)
  const [confirmOpen, setConfirmOpen] = useState(false);

  // -- Handlers de UI --
  
  const handleUploadClick = () => {
    if (!batchState.batchId || !batchState.livePreview) {
      toast.warning("Selecciona un set de contenido y una imagen para enviar a SFMC.");
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmSend = async () => {
    // a. Primero guardamos ediciones en backend
    try {
      await batchState.saveEdits();
    } catch {
      return; // Si falla guardar, no enviamos
    }

    // b. Luego enviamos a SFMC usando el hook dedicado
    const success = await sfmcSender.sendToSfmc({
      batchId: batchState.batchId,
      livePreview: batchState.livePreview,
      contentSets: batchState.contentSets,
      images: batchState.images,
      editedRef: batchState.editedRef,
    });

    if (success) {
      setConfirmOpen(false);
    }
  };

  const fileNameHint = batchState.batchId 
    ? `sfmc_draft_${batchState.batchId}.json` 
    : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <main
        className="
          mx-auto max-w-[1880px] px-3 md:px-5 lg:px-7 xl:pl-3 xl:pr-6 2xl:pl-4 2xl:pr-8
          grid gap-6 grid-cols-1
          xl:grid-cols-[380px_minmax(820px,1fr)_480px]
          2xl:grid-cols-[420px_minmax(980px,1fr)_560px]
        "
        style={{ alignItems: "start" }}
      >
        {/* Columna 1: Sidebar (Input IA) */}
        <aside className="order-1 xl:order-none bg-white rounded-2xl border shadow-sm p-4 md:p-5 sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-auto overscroll-contain">
          <Email2Sidebar
            onGenerated={batchState.handleGenerated}
            currentBatchId={batchState.batchId}
          />
        </aside>

        {/* Columna 2: Workspace (Edición) */}
        <section className="p-1 md:p-2 lg:p-3 min-h-[calc(100vh-2rem)] overflow-auto overscroll-contain">
          <Email2Workspace
            batchId={batchState.batchId}
            trios={batchState.contentSets}
            images={batchState.images}
            showInternalPreview={false}
            onPreviewChange={batchState.setLivePreview}
            onEditedChange={batchState.handleEditedChange}
          />
        </section>

        {/* Columna 3: Preview & Acciones */}
        <PreviewPanel
          livePreview={batchState.livePreview}
          batchId={batchState.batchId}
          isSaving={batchState.isSaving}
          isUploading={sfmcSender.isUploading}
          lastSavedAt={batchState.lastSavedAt}
          savedVisible={batchState.savedVisible}
          sfmcNotice={sfmcSender.sfmcNotice}
          onSave={batchState.saveEdits}
          onUploadClick={handleUploadClick}
        />
      </main>

      {/* Modales */}
      <ConfirmSendModal
        open={confirmOpen}
        busy={sfmcSender.isUploading}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmSend}
        // Corrección: Mapeo explícito de tipos (content -> body)
        preview={
          batchState.livePreview
            ? {
                subject: batchState.livePreview.subject,
                preheader: batchState.livePreview.preheader,
                title: batchState.livePreview.title,
                subtitle: batchState.livePreview.subtitle,
                body: batchState.livePreview.content, // Aquí está el mapeo clave
                heroUrl: batchState.livePreview.heroUrl,
              }
            : undefined
        }
        fileNameHint={fileNameHint}
        logoSrc="/salesforce2.png"
      />

      <div className="h-6" />
    </div>
  );
}