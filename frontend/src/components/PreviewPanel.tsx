import React from "react";
import { EmailPreview } from "@/components/EmailPreview";
import type { PreviewData } from "@/components/Email2Workspace";

interface PreviewPanelProps {
  livePreview: PreviewData | null;
  batchId: string;
  isSaving: boolean;
  isUploading: boolean;
  lastSavedAt: string | null;
  savedVisible: boolean;
  sfmcNotice: string | null;
  onSave: () => void;
  onUploadClick: () => void;
}

export function PreviewPanel({
  livePreview,
  batchId,
  isSaving,
  isUploading,
  lastSavedAt,
  savedVisible,
  sfmcNotice,
  onSave,
  onUploadClick,
}: PreviewPanelProps) {
  return (
    <aside className="hidden xl:flex flex-col h-full border-l border-slate-200 bg-white shadow-lg shadow-slate-200 z-20">
      
      {/* 1. HEADER FIJO */}
      <div className="shrink-0 h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white/95 backdrop-blur">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <span className="text-lg">📱</span> Vista Previa
        </span>
        {livePreview && (
            <div className="flex items-center gap-2 px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-bold text-emerald-700 uppercase">En vivo</span>
            </div>
        )}
      </div>

      {/* 2. CONTENIDO SCROLLABLE (Email) */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8 custom-scrollbar flex justify-center">
        {!livePreview ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl opacity-60 w-full">
            <div className="text-4xl mb-4 grayscale opacity-50">📱</div>
            <p className="text-sm font-semibold text-slate-500">
              Selecciona contenido
            </p>
            <p className="text-xs text-slate-400 mt-2 max-w-[200px]">
              Elige un set de texto y una imagen para ver la vista previa.
            </p>
          </div>
        ) : (
          // Contenedor del Preview del Email (Aumentado a 480px para aprovechar el ancho)
          <div className="w-full max-w-[480px]">
             <div className="bg-white border border-slate-200 shadow-2xl shadow-slate-200/60 rounded-[32px] overflow-hidden ring-4 ring-slate-100 mb-4 transition-all duration-500">
                <EmailPreview
                subject={livePreview.subject}
                preheader={livePreview.preheader}
                title={livePreview.title || undefined}
                subtitle={livePreview.subtitle ?? undefined}
                body={livePreview.content}
                heroUrl={livePreview.heroUrl}
                />
             </div>
             <div className="text-center text-[10px] text-slate-400 font-mono">
                Vista emulada
             </div>
          </div>
        )}
      </div>

      {/* 3. FOOTER FIJO (STICKY) */}
      <div className="shrink-0 border-t border-slate-200 bg-white p-6 shadow-[0_-10px_30px_rgba(0,0,0,0.04)] z-30">
        
        {/* Mensajes de estado */}
        <div className="min-h-[24px] mb-3 flex items-center justify-center text-center">
             {lastSavedAt && savedVisible && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full animate-in fade-in slide-in-from-bottom-2">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Guardado {lastSavedAt}
                </span>
             )}
             {sfmcNotice && !savedVisible && (
                 <span className="text-[11px] font-bold text-sky-600 bg-sky-50 px-3 py-1 rounded-full truncate">
                    🚀 {sfmcNotice}
                 </span>
             )}
        </div>

        <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={onSave}
              disabled={!batchId || isSaving}
              className={`
                flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-all
                ${isSaving 
                    ? "bg-slate-100 text-slate-400 cursor-wait" 
                    : batchId 
                        ? "bg-white border border-slate-200 text-slate-600 hover:border-sky-400 hover:text-sky-600 hover:shadow-md" 
                        : "bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed"}
              `}
            >
              {isSaving ? "Guardando..." : "Guardar"}
            </button>

            <button
              type="button"
              onClick={onUploadClick}
              disabled={!batchId || isUploading}
              className={`
                flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-100 transition-all
                ${isUploading 
                    ? "bg-emerald-400 cursor-wait" 
                    : batchId 
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-xl hover:shadow-emerald-200 hover:-translate-y-0.5 active:scale-95" 
                        : "bg-slate-200 cursor-not-allowed shadow-none"}
              `}
            >
              {isUploading ? "Enviando..." : "Enviar a SFMC"}
            </button>
        </div>
      </div>
    </aside>
  );
}