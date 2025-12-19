// frontend/src/components/Email2ActionPanel.tsx
import React from "react";
import { Download, Upload, Loader2, Check } from "lucide-react";

interface Email2ActionPanelProps {
  mode?: "full" | "compact";
  livePreview: any;
  batchId?: string;
  isSaving?: boolean;
  isUploading?: boolean;
  lastSavedAt?: Date | string | null;  // ✅ Acepta Date o string
  savedVisible?: boolean;
  sfmcSuccess?: any;  // ✅ Acepta cualquier tipo (objeto o boolean)
  onSave: () => Promise<void>;
  onUploadClick: () => void;
}

export function Email2ActionPanel({
  mode = "full",
  livePreview,
  batchId,
  isSaving = false,
  isUploading = false,
  lastSavedAt,
  savedVisible = false,
  sfmcSuccess,
  onSave,
  onUploadClick,
}: Email2ActionPanelProps) {
  const canSave = Boolean(batchId);
  const canUpload = Boolean(batchId && livePreview);
  
  // ✅ Convierte sfmcSuccess a boolean (maneja objeto o boolean)
  const hasSfmcSuccess = Boolean(sfmcSuccess);
  
  // ✅ Formatea lastSavedAt (maneja Date o string)
  const formatLastSaved = () => {
    if (!lastSavedAt) return "";
    if (lastSavedAt instanceof Date) {
      return lastSavedAt.toLocaleTimeString();
    }
    // Si es string, intenta parsearlo
    try {
      return new Date(lastSavedAt).toLocaleTimeString();
    } catch {
      return String(lastSavedAt);
    }
  };

  // MODO COMPACT: Horizontal para tablets (1024-1280px)
  if (mode === "compact") {
    return (
      <div className="flex items-center justify-between gap-4 p-4 w-full">
        {/* Estado de guardado */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {isSaving && (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              Guardando...
            </span>
          )}
          {savedVisible && !isSaving && (
            <span className="flex items-center gap-1.5 text-emerald-600">
              <Check className="h-3 w-3" />
              Guardado
            </span>
          )}
          {lastSavedAt && !isSaving && !savedVisible && (
            <span>Guardado {formatLastSaved()}</span>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3">
          <button
            onClick={onSave}
            disabled={!canSave || isSaving}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
              ${
                !canSave || isSaving
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-slate-700 text-white hover:bg-slate-800 active:scale-95"
              }
            `}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Guardar
          </button>

          <button
            onClick={onUploadClick}
            disabled={!canUpload || isUploading}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
              ${
                !canUpload || isUploading
                  ? "bg-blue-200 text-blue-400 cursor-not-allowed"
                  : hasSfmcSuccess
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
              }
            `}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : hasSfmcSuccess ? (
              <Check className="h-4 w-4" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {hasSfmcSuccess ? "Enviado ✓" : "Enviar a SFMC"}
          </button>
        </div>
      </div>
    );
  }

  // MODO FULL: Vertical para desktop XL (>1280px)
  return (
    <div className="border-t bg-white p-6 space-y-4">
      {/* Estado de guardado */}
      <div className="text-center text-xs text-slate-500 min-h-[20px]">
        {isSaving && (
          <span className="flex items-center justify-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            Guardando...
          </span>
        )}
        {savedVisible && !isSaving && (
          <span className="flex items-center justify-center gap-1.5 text-emerald-600">
            <Check className="h-3 w-3" />
            Guardado correctamente
          </span>
        )}
        {lastSavedAt && !isSaving && !savedVisible && (
          <span>Último guardado: {formatLastSaved()}</span>
        )}
      </div>

      {/* Botones verticales */}
      <div className="space-y-3">
        <button
          onClick={onSave}
          disabled={!canSave || isSaving}
          className={`
            w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all
            ${
              !canSave || isSaving
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-slate-700 text-white hover:bg-slate-800 active:scale-[0.98]"
            }
          `}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Guardar Borrador
        </button>

        <button
          onClick={onUploadClick}
          disabled={!canUpload || isUploading}
          className={`
            w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all
            ${
              !canUpload || isUploading
                ? "bg-blue-200 text-blue-400 cursor-not-allowed"
                : hasSfmcSuccess
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]"
            }
          `}
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : hasSfmcSuccess ? (
            <Check className="h-5 w-5" />
          ) : (
            <Upload className="h-5 w-5" />
          )}
          {hasSfmcSuccess ? "Enviado a Salesforce ✓" : "Enviar a Salesforce"}
        </button>
      </div>

      {/* Indicador de éxito */}
      {hasSfmcSuccess && (
        <div className="text-xs text-center text-emerald-600 font-medium">
          ✓ Borrador disponible en Marketing Cloud
        </div>
      )}
    </div>
  );
}