// frontend/src/components/PreviewPanel.tsx
import React, { useState, useEffect } from "react";
import { EmailPreview } from "@/components/EmailPreview";
import { 
  Mail, 
  ExternalLink, 
  Image as ImageIcon, 
  CheckCircle2, 
  Loader2,
  X // <--- Icono para cerrar
} from "lucide-react";
import type { PreviewData } from "@/components/Email2Workspace";
import type { SfmcSuccessData } from "@/hooks/useSfmcDraftSender";

interface PreviewPanelProps {
  livePreview: PreviewData | null;
  batchId: string;
  isSaving: boolean;
  isUploading: boolean;
  lastSavedAt: string | null;
  savedVisible: boolean;
  sfmcSuccess: SfmcSuccessData | null; // Objeto con datos
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
  sfmcSuccess,
  onSave,
  onUploadClick,
}: PreviewPanelProps) {
  
  // Estado local para manejar la visibilidad de la tarjeta de éxito
  const [showSuccessCard, setShowSuccessCard] = useState(false);

  // Efecto: Cuando llega un nuevo éxito, mostramos la tarjeta automáticamente
  useEffect(() => {
    if (sfmcSuccess) {
      setShowSuccessCard(true);
    }
  }, [sfmcSuccess]);

  return (
    <aside className="hidden xl:flex flex-col h-full border-l border-slate-200 bg-white shadow-xl shadow-slate-200/50 z-20 w-[440px] 2xl:w-[500px]">
      
      {/* 1. HEADER FIJO */}
      <div className="shrink-0 h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white/95 backdrop-blur-md">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <span className="text-lg">📱</span> Vista Previa
        </span>
        {livePreview && (
            <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">En vivo</span>
            </div>
        )}
      </div>

      {/* 2. CONTENIDO SCROLLABLE (Email) */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 custom-scrollbar flex justify-center">
        {!livePreview ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl opacity-60 w-full mx-4">
            <div className="text-4xl mb-4 grayscale opacity-50">📱</div>
            <p className="text-sm font-semibold text-slate-500">
              Selecciona contenido
            </p>
            <p className="text-xs text-slate-400 mt-2 max-w-[200px]">
              Elige un set de texto y una imagen para ver la vista previa.
            </p>
          </div>
        ) : (
          <div className="w-full max-w-[420px]">
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
                Renderizado móvil
             </div>
          </div>
        )}
      </div>

      {/* 3. FOOTER FIJO (ACCIONES Y FEEDBACK) */}
      <div className="shrink-0 border-t border-slate-200 bg-white p-6 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] z-30 relative">
        
        {/* A. TARJETA DE ÉXITO SFMC (CERRABLE) */}
        {showSuccessCard && sfmcSuccess && (
          <div className="relative mb-5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm animate-in slide-in-from-bottom-4 duration-500">
            
            {/* Botón Cerrar (X) */}
            <button 
              onClick={() => setShowSuccessCard(false)}
              className="absolute top-2 right-2 p-1 text-emerald-400 hover:text-emerald-700 hover:bg-emerald-100 rounded-full transition-colors"
              title="Cerrar notificación"
            >
              <X size={14} />
            </button>

            {/* Cabecera Éxito */}
            <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-emerald-100/80 pr-6">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                  Borrador Creado en Salesforce
                </h4>
                <p className="text-[10px] text-emerald-600 font-medium font-mono">
                  {sfmcSuccess.timestamp}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Link Principal: Borrador */}
              {sfmcSuccess.emailId && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600/70 pl-1">
                    Acceso Directo
                  </span>
                  <a
                    href={`https://mc.exacttarget.com/cloud/#app/Content%20Builder/Content%20Builder/(content-builder:content/${sfmcSuccess.emailId})`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-3 rounded-lg bg-white border border-emerald-100 p-2.5 shadow-sm transition-all hover:border-emerald-400 hover:shadow-md hover:ring-1 hover:ring-emerald-400/20 active:scale-[0.99]"
                    title="Abrir Borrador en Content Builder"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                          Abrir Email #{sfmcSuccess.emailId}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate">
                          Clic para editar en Content Builder
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-emerald-500" />
                  </a>
                </div>
              )}

              {/* Link Secundario: Imagen */}
              {sfmcSuccess.imageUrl && (
                <div className="mt-1 pt-2 border-t border-emerald-100/50">
                  <div className="flex items-center gap-2 px-1">
                    <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] text-slate-500 font-medium">Asset:</span>
                    <a
                      href={sfmcSuccess.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-sky-600 truncate font-mono hover:underline decoration-sky-300 underline-offset-2 flex-1"
                      title={sfmcSuccess.imageUrl}
                    >
                      {sfmcSuccess.imageUrl}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* B. FEEDBACK DE GUARDADO (TEMPORAL) */}
        {lastSavedAt && savedVisible && !showSuccessCard && (
           <div className="mb-4 flex justify-center animate-in fade-in slide-in-from-bottom-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Cambios guardados a las {lastSavedAt}
              </span>
           </div>
        )}

        {/* C. BOTONES DE ACCIÓN */}
        <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onSave}
              disabled={!batchId || isSaving}
              className={`
                flex items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-bold uppercase tracking-wider transition-all
                ${isSaving 
                    ? "bg-slate-100 text-slate-400 cursor-wait" 
                    : batchId 
                        ? "bg-white border border-slate-200 text-slate-600 hover:border-sky-400 hover:text-sky-600 hover:shadow-sm hover:bg-sky-50/20 active:scale-[0.98]" 
                        : "bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed"}
              `}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> 
                  <span>Guardando...</span>
                </>
              ) : (
                "Guardar"
              )}
            </button>

            <button
              type="button"
              onClick={onUploadClick}
              disabled={!batchId || isUploading}
              className={`
                flex items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all
                ${isUploading 
                    ? "bg-emerald-400 cursor-wait" 
                    : batchId 
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-lg hover:shadow-emerald-200/50 hover:-translate-y-0.5 active:scale-[0.98]" 
                        : "bg-slate-200 cursor-not-allowed shadow-none"}
              `}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> 
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <span className="text-sm">🚀</span> 
                  <span>Enviar a SFMC</span>
                </>
              )}
            </button>
        </div>
      </div>
    </aside>
  );
}