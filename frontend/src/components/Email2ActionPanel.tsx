// frontend/src/components/Email2ActionPanel.tsx
import React from "react";
import { useSfmcDraftSender } from "@/hooks/useSfmcDraftSender";
import { Loader2, ExternalLink, Image as ImageIcon, Mail, CheckCircle2 } from "lucide-react";
import type { PreviewData, EmailContentSet } from "@/components/Email2Workspace";
import type { EmailV2Image } from "@/lib/apiEmailV2";

interface Email2ActionPanelProps {
  batchId: string;
  livePreview: PreviewData | null;
  contentSets: EmailContentSet[];
  images: EmailV2Image[];
  editedRef: React.MutableRefObject<EmailContentSet[] | null>;
  onSave?: () => void;
  isSaving?: boolean;
}

export function Email2ActionPanel({
  batchId,
  livePreview,
  contentSets,
  images,
  editedRef,
  onSave,
  isSaving = false,
}: Email2ActionPanelProps) {
  // Hook que maneja el envío a Salesforce y el estado de éxito
  const { isUploading, sfmcSuccess, sendToSfmc } = useSfmcDraftSender();

  return (
    <div className="shrink-0 border-t border-slate-200 bg-white p-5 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40">
      
      {/* === ZONA DE FEEDBACK (Tarjeta de Éxito) === */}
      {sfmcSuccess && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm animate-in slide-in-from-bottom-2 duration-300">
          
          {/* Título */}
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-emerald-100/80">
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
            {/* 1. LINK AL CORREO (EL IMPORTANTE) */}
            {sfmcSuccess.emailId && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 pl-1">
                  Acceso Directo
                </span>
                <a
                  href={`https://mc.exacttarget.com/cloud/#app/Content%20Builder/Content%20Builder/(content-builder:content/${sfmcSuccess.emailId})`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-3 rounded-lg bg-white border border-slate-200 p-3 shadow-sm transition-all hover:border-emerald-400 hover:shadow-md hover:ring-1 hover:ring-emerald-400/20 active:scale-[0.99]"
                  title="Abrir Borrador en Content Builder"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
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

            {/* 2. LINK A LA IMAGEN (SECUNDARIO) */}
            {sfmcSuccess.imageUrl && (
              <div className="mt-2 pt-2 border-t border-emerald-100/50">
                <div className="flex items-center gap-2 px-1">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] text-slate-500 font-medium">Recurso de imagen:</span>
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

      {/* === BOTONERA DE ACCIONES === */}
      <div className="grid grid-cols-2 gap-4">
        {/* Botón Guardar (Local) */}
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || !onSave}
          className="
            flex items-center justify-center gap-2 rounded-xl py-3.5 px-4 text-xs font-bold uppercase tracking-wider transition-all
            bg-white border border-slate-200 text-slate-600 
            hover:border-sky-300 hover:text-sky-600 hover:bg-sky-50/30 hover:shadow-sm 
            active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            "Guardar Cambios"
          )}
        </button>

        {/* Botón Enviar a SFMC (Salesforce) */}
        <button
          type="button"
          onClick={() =>
            sendToSfmc({ batchId, livePreview, contentSets, images, editedRef })
          }
          disabled={isUploading || !livePreview}
          className={`
            flex items-center justify-center gap-2 rounded-xl py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all
            active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none
            ${
              isUploading 
                ? "bg-emerald-400 cursor-wait" 
                : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-lg hover:shadow-emerald-200/50 hover:-translate-y-0.5"
            }
          `}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
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
  );
}