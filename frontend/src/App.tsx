import React, { useState } from "react";
import "./styles/index.css";
import { toast } from "sonner";

import { useEmailBatchState } from "@/hooks/useEmailBatchState";
import { useSfmcDraftSender } from "@/hooks/useSfmcDraftSender";

import { Email2Sidebar } from "@/components/Email2Sidebar";
import { Email2Workspace } from "@/components/Email2Workspace";
import { PreviewPanel } from "@/components/PreviewPanel";
import { ConfirmSendModal } from "@/components/ui/ConfirmSendModal";

export default function App() {
  const batchState = useEmailBatchState();
  const sfmcSender = useSfmcDraftSender();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleUploadClick = () => {
    if (!batchState.batchId || !batchState.livePreview) {
      toast.warning("Selecciona un set y una imagen para enviar.");
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmSend = async () => {
    try {
      await batchState.saveEdits();
    } catch {
      return;
    }

    const success = await sfmcSender.sendToSfmc({
      batchId: batchState.batchId,
      livePreview: batchState.livePreview,
      contentSets: batchState.contentSets,
      images: batchState.images,
      editedRef: batchState.editedRef,
    });

    if (success) setConfirmOpen(false);
  };

  const fileNameHint = batchState.batchId
    ? `sfmc_draft_${batchState.batchId}.json`
    : undefined;

  return (
    <div className="h-screen w-full bg-slate-50 overflow-hidden flex flex-col font-sans text-slate-900">
      {/* GRID: 420px | Auto | 540px */}
      <main
        className="
          flex-1 min-h-0
          grid grid-cols-1
          lg:grid-cols-[420px_minmax(0,1fr)]
          xl:grid-cols-[420px_minmax(0,1fr)_540px]
          grid-rows-[minmax(0,1fr)]
          divide-x divide-slate-200
        "
      >
        {/* COL 1: SIDEBAR (Izquierda) */}
        {/* 'pb-40' para asegurar que al expandir todo se pueda llegar al final con scroll */}
        <aside className="hidden lg:block h-full min-h-0 overflow-y-auto bg-white custom-scrollbar relative z-10">
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <span className="text-lg">⚙️</span> Configuración
            </h2>
          </div>

          <div className="p-6 pb-40">
            <Email2Sidebar
              onGenerated={batchState.handleGenerated}
              currentBatchId={batchState.batchId}
            />
          </div>
        </aside>

        {/* COL 2: WORKSPACE (Centro) */}
        <section className="h-full min-h-0 overflow-y-auto bg-slate-50/50 relative custom-scrollbar">
          <div className="max-w-[1600px] mx-auto min-h-full flex flex-col">
            <Email2Workspace
              batchId={batchState.batchId}
              trios={batchState.contentSets}
              images={batchState.images}
              showInternalPreview={false}
              onPreviewChange={batchState.setLivePreview}
              onEditedChange={batchState.handleEditedChange}
            />
            {/* Espacio de seguridad para scroll */}
            <div className="h-32 shrink-0" />
          </div>
        </section>

        {/* COL 3: PREVIEW (Derecha) */}
        <div className="h-full min-h-0 overflow-y-auto bg-white custom-scrollbar">
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
        </div>
      </main>

      {/* Modal Global */}
      <ConfirmSendModal
        open={confirmOpen}
        busy={sfmcSender.isUploading}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmSend}
        preview={
          batchState.livePreview
            ? {
                subject: batchState.livePreview.subject,
                preheader: batchState.livePreview.preheader,
                title: batchState.livePreview.title,
                subtitle: batchState.livePreview.subtitle,
                body: batchState.livePreview.content,
                heroUrl: batchState.livePreview.heroUrl,
              }
            : undefined
        }
        fileNameHint={fileNameHint}
        logoSrc="/salesforce2.png"
      />
    </div>
  );
}
