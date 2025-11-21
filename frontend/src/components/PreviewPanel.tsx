// frontend/src/components/PreviewPanel.tsx
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
    <aside className="hidden xl:flex flex-col gap-4 sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-auto overscroll-contain px-1">
      <div className="text-sm font-semibold text-slate-700">Vista previa</div>

      {!livePreview ? (
        <div className="rounded-[20px] p-6 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.10),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.10),transparent_45%)] text-slate-500 text-sm">
          Genera un lote y selecciona un <strong>set de contenido</strong> + una
          imagen para ver el preview aquí.
        </div>
      ) : (
        <>
          <EmailPreview
            subject={livePreview.subject}
            preheader={livePreview.preheader}
            title={livePreview.title || undefined}
            subtitle={livePreview.subtitle ?? undefined}
            body={livePreview.content}
            heroUrl={livePreview.heroUrl}
          />

          {/* Botones de Acción */}
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={onSave}
              disabled={!batchId || isSaving}
              className={`min-w-[160px] rounded-xl px-4 py-3 text-sm md:text-base font-semibold text-white shadow-sm transition ${
                isSaving
                  ? "bg-sky-400 cursor-wait"
                  : batchId
                  ? "bg-sky-600 hover:bg-sky-700 active:scale-[0.99]"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
              title="Guardar ediciones en el batch"
            >
              {isSaving ? "Guardando…" : "Guardar ediciones"}
            </button>

            <button
              type="button"
              onClick={onUploadClick}
              disabled={!batchId || isUploading}
              className={`min-w-[160px] rounded-xl px-4 py-3 text-sm md:text-base font-semibold text-white shadow-sm transition ${
                isUploading
                  ? "bg-emerald-400 cursor-wait"
                  : batchId
                  ? "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99]"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
              title="Crear borrador en SFMC"
            >
              {isUploading ? "Enviando…" : "Enviar a SFMC"}
            </button>
          </div>

          {/* Mensajes de Estado */}
          <div className="mt-2 text-center space-y-2">
            <div className="relative h-7">
              {lastSavedAt && (
                <div
                  className={`pointer-events-none absolute inset-x-0 flex justify-center transition-all duration-500 ${
                    savedVisible
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 -translate-y-1"
                  }`}
                  aria-live="polite"
                >
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm">
                    ✅ Guardado correctamente
                    {lastSavedAt ? ` · ${lastSavedAt}` : ""}
                  </span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-neutral-500">
              * Asegúrate de “Guardar ediciones” antes de enviar.
            </p>
            {sfmcNotice && (
              <p className="text-[12px] text-emerald-700">{sfmcNotice}</p>
            )}
          </div>
        </>
      )}
    </aside>
  );
}