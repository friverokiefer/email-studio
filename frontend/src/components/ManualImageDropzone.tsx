// frontend/src/components/ManualImageDropzone.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { toast } from "sonner";
import type { EmailV2Image } from "@/lib/apiEmailV2";
import { uploadManualImageToBatch } from "@/lib/apiEmailV2";

type ManualImageDropzoneProps = {
  batchId?: string;
  onUploaded?: (image: EmailV2Image) => void;
};

// CONFIGURACIÓN
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/svg+xml"];
const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export function ManualImageDropzone({
  batchId,
  onUploaded,
}: ManualImageDropzoneProps) {
  // Volvemos a lógica singular (1 sola imagen) para asegurar estabilidad
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Limpiar URL de preview al desmontar / cambiar
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const reset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [previewUrl]);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const f = files[0]; // Tomamos solo el primero

      const mimeOk =
        ALLOWED_MIME.includes(f.type) ||
        /\.(jpe?g|png|svg)$/i.test(f.name || "");

      if (!mimeOk) {
        toast.error("Solo se permiten imágenes JPG, PNG o SVG.");
        return;
      }

      if (f.size > MAX_SIZE_BYTES) {
        toast.error("La imagen es demasiado pesada (máx 15MB).");
        return;
      }

      // Reemplazamos si ya había una
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    },
    [previewUrl]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUploading) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUploading) return;
    setIsDragging(false);
    handleFiles(e.dataTransfer?.files ?? null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  // Click en el contenedor abre el selector (pero no si viene del botón)
  const handleClick = () => {
    if (isUploading) return;
    inputRef.current?.click();
  };

  const handleUpload = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // 🛑 IMPORTANTE: Detenemos la propagación del click hacia el contenedor padre
    e.stopPropagation(); 
    e.preventDefault();

    if (!batchId) {
      toast.error("Primero selecciona o genera un lote.");
      return;
    }
    if (!file) {
      toast.error("Selecciona una imagen antes de subir.");
      return;
    }

    try {
      setIsUploading(true);
      // Subida de imagen única
      const resp = await uploadManualImageToBatch(batchId, file);
      
      if (!resp?.image) {
        throw new Error("El servidor no devolvió la imagen procesada.");
      }
      
      onUploaded?.(resp.image);
      toast.success("Imagen subida correctamente.");
      reset(); // Limpiamos el estado tras éxito

    } catch (err: any) {
      // Manejo específico si es error 413 (aunque suele venir como excepción genérica de red)
      if (err.message?.includes("413") || err.response?.status === 413) {
        toast.error("Error: La imagen es muy pesada para el servidor (Nginx 413).");
      } else {
        toast.error(err?.message || "Error al subir la imagen.");
      }
      console.error("[ManualImageDropzone] upload error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  // Sin batchId, no se renderiza
  if (!batchId) return null;

  const hasFile = !!file;

  const containerClasses = [
    "relative flex flex-col md:flex-row gap-3 rounded-2xl border-2 border-dashed px-3 py-3 md:px-4 md:py-3 bg-white/70 transition-all",
    "cursor-pointer", // Indica interactividad
    isDragging
      ? "border-sky-500 bg-sky-50/60"
      : "border-slate-200 hover:border-sky-300 hover:bg-slate-50/80",
    isUploading ? "opacity-70 cursor-wait" : "",
  ].join(" ");

  return (
    <div className="mb-3">
      <div
        className={containerClasses}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {/* Lado Izquierdo: Icono y Texto */}
        <div className="flex-1 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700 text-lg shrink-0">
            🖱️
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-slate-800">
              Subir imagen manual al batch
            </p>
            <p className="text-[10px] text-slate-500">
              Arrastra 1 archivo JPG, PNG o SVG (Máx 15MB).
            </p>
            <p className="text-[9px] text-slate-400">
              Se guardará como <span className="font-mono">model: "manual-upload"</span>.
            </p>
          </div>
        </div>

        {/* Lado Derecho: Botón e Info */}
        <div className="flex flex-col items-end justify-between gap-2">
          {hasFile ? (
            <div className="flex flex-col items-end text-right">
              <span className="text-[10px] font-medium text-slate-700 max-w-[180px] truncate">
                {file?.name}
              </span>
              <span className="text-[9px] text-slate-400">
                {(file!.size / 1024).toFixed(1)} KB
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 text-right">
              Ningún archivo
            </span>
          )}

          <button
            type="button"
            disabled={!hasFile || isUploading}
            onClick={handleUpload}
            className={[
              "mt-1 inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-[11px] font-semibold shadow-sm transition",
              "relative z-10", // Asegura prioridad de click sobre el contenedor
              !hasFile || isUploading
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-sky-600 text-white hover:bg-sky-700 active:scale-[0.98]",
            ].join(" ")}
          >
            {isUploading ? "Subiendo..." : "Cargar al batch"}
          </button>
        </div>

        {/* Preview (Miniatura Única) */}
        {previewUrl && (
          <div className="mt-3 md:mt-0 md:ml-4 flex items-center justify-center shrink-0">
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs w-24 h-16">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        id="manual-image-input"
        type="file"
        accept="image/jpeg,image/png,image/svg+xml"
        className="hidden"
        onChange={handleFileInputChange}
      />
    </div>
  );
}