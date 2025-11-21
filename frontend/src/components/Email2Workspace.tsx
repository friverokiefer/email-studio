// frontend/src/components/Email2Workspace.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { EmailV2Image, EmailContentSet } from "@/lib/apiEmailV2";
import { EmailPreview } from "./EmailPreview";

// 👇 re-export del tipo para que App.tsx pueda importarlo desde aquí
export type { EmailContentSet } from "@/lib/apiEmailV2";

export type PreviewData = {
  subject: string;
  preheader: string;
  title: string;
  subtitle: string | null;
  content: string;
  heroUrl: string;
};

// === Config GCS para asegurar URLs absolutas ===
const VITE_GCS_BUCKET = (import.meta as any).env?.VITE_GCS_BUCKET || "";
const VITE_GCS_PREFIX = (import.meta as any).env?.VITE_GCS_PREFIX || "dev";

function isAbsoluteUrl(u?: string) {
  return !!u && /^https?:\/\//i.test(u);
}

function pathJoinAndEncode(...parts: (string | undefined | null)[]) {
  const segs: string[] = [];
  for (const p of parts) {
    if (!p) continue;
    const trimmed = String(p).replace(/^\/+|\/+$/g, "");
    if (!trimmed) continue;
    for (const s of trimmed.split("/")) {
      if (!s) continue;
      segs.push(encodeURIComponent(s));
    }
  }
  return segs.join("/");
}

function gcsDirectObjectUrl(batchId: string, fileName: string) {
  if (!VITE_GCS_BUCKET) return null;
  const path = pathJoinAndEncode(VITE_GCS_PREFIX, "emails_v2", batchId, fileName);
  return `https://storage.googleapis.com/${VITE_GCS_BUCKET}/${path}`;
}

function absoluteHeroUrl(batchId: string, img: EmailV2Image): string {
  const current = img?.heroUrl || "";
  if (isAbsoluteUrl(current)) return current;
  const candidate = img?.fileName || current || (img as any)?.url || "";
  if (!candidate) return current;
  const url = gcsDirectObjectUrl(batchId, candidate);
  return url || current;
}

/** * Normaliza un set para asegurar estructura.
 * SIN TRIMS para permitir espacios durante la edición.
 */
function normalizeSet(t: EmailContentSet): EmailContentSet {
  const body = (t?.body || {}) as Partial<EmailContentSet["body"]>;
  return {
    ...t,
    subject: t?.subject ?? "",
    preheader: t?.preheader ?? "",
    body: {
      title: body?.title ?? "",
      subtitle: (body?.subtitle ?? "") || null,
      content: body?.content ?? "",
    },
  };
}

function normalizeSets(arr: EmailContentSet[] | undefined | null): EmailContentSet[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((t) => normalizeSet(t));
}

/** === COMPONENTE ======================================================= */
export function Email2Workspace({
  batchId,
  trios,
  images,
  showInternalPreview = true,
  onPreviewChange,
  onEditedChange,
}: {
  batchId: string;
  trios: EmailContentSet[];
  images: EmailV2Image[];
  showInternalPreview?: boolean;
  onPreviewChange?: (data: PreviewData | null) => void;
  onEditedChange?: (sets: EmailContentSet[]) => void;
}) {
  // Inicializamos estado local con props, pero permitimos divergencia
  const [edited, setEdited] = useState<EmailContentSet[]>(() =>
    normalizeSets(trios)
  );
  
  const [selectedSet, setSelectedSet] = useState<number | null>(
    (trios || []).length ? 0 : null
  );
  const [selectedImage, setSelectedImage] = useState<number | null>(
    images.length ? 0 : null
  );

  const prevBatchRef = useRef<string | null>(null);

  // 1. Reset completo cuando cambia el batchId (Nueva generación)
  useEffect(() => {
    if (prevBatchRef.current !== batchId) {
      prevBatchRef.current = batchId;
      const norm = normalizeSets(trios);
      setEdited(norm);
      setSelectedSet(norm.length ? 0 : null);
      setSelectedImage(images.length ? 0 : null);
    }
  }, [batchId, trios, images]);

  // 2. Sincronización Estricta: Solo actualizamos si `trios` cambia de referencia.
  // Eliminamos la comparación JSON.stringify que causaba el bug del "trim" automático.
  useEffect(() => {
    if (prevBatchRef.current !== batchId) return;
    
    // Solo si trios tiene contenido, actualizamos la base local.
    // Esto respeta las ediciones del usuario hasta que el padre mande data nueva explícita.
    if (trios && trios.length > 0) {
       setEdited(normalizeSets(trios));
    }
  }, [trios, batchId]);

  // Sincronizar selección de imágenes
  useEffect(() => {
    if (prevBatchRef.current !== batchId) return;
    setSelectedImage((prev) => {
      const len = images.length;
      if (len === 0) return null;
      if (prev == null) return 0;
      return prev >= len ? len - 1 : prev;
    });
  }, [images, batchId]);

  // Notificar ediciones al padre
  useEffect(() => {
    onEditedChange?.(edited);
  }, [edited, onEditedChange]);

  function updateSet(idx: number, patch: Partial<EmailContentSet>) {
    setEdited((prev) => {
      if (!prev[idx]) return prev;
      const next = [...prev];
      next[idx] = normalizeSet({ ...next[idx], ...patch });
      return next;
    });
  }

  function updateSetBody(idx: number, patch: Partial<EmailContentSet["body"]>) {
    setEdited((prev) => {
      if (!prev[idx]) return prev;
      const next = [...prev];
      next[idx] = normalizeSet({
        ...next[idx],
        body: { ...next[idx].body, ...patch },
      });
      return next;
    });
  }

  function autoResize(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  // Preview calculada
  const preview = useMemo<PreviewData | null>(() => {
    if (selectedSet == null || selectedImage == null) return null;
    const t = edited[selectedSet];
    const img = images[selectedImage];
    if (!t || !img) return null;
    return {
      subject: t.subject,
      preheader: t.preheader,
      title: t.body?.title ?? "",
      subtitle: t.body?.subtitle ?? null,
      content: t.body?.content ?? "",
      heroUrl: absoluteHeroUrl(batchId, img),
    };
  }, [edited, images, selectedSet, selectedImage, batchId]);

  // Exponer preview al padre
  useEffect(() => {
    onPreviewChange?.(preview);
  }, [preview, onPreviewChange]);

  // === ESTILOS ===
  const labelStyle = "mb-1.5 block text-xs font-semibold text-slate-700 uppercase tracking-wide";
  const inputBaseStyle = "w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 resize-y leading-relaxed hover:border-slate-300";
  
  const cardStyle: React.CSSProperties = {
    flex: "0 0 clamp(340px, 40vw, 500px)",
  };

  return (
    <div className="space-y-10 font-sans">
      {/* SETS */}
      <section>
        <div className="mb-5 flex items-end justify-between px-1">
          <div>
             <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                Sets de Contenido
             </h3>
             <p className="text-sm text-slate-500 mt-1">
                Edita el texto del correo. Tus cambios se reflejan en tiempo real.
             </p>
          </div>
          {edited.length > 0 && (
             <div className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200">
                {edited.length} Variantes
             </div>
          )}
        </div>

        {edited.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
             <div className="text-4xl mb-3">✍️</div>
             <h4 className="text-slate-600 font-medium">Espacio de Trabajo vacío</h4>
             <p className="text-slate-400 text-sm mt-1">Genera contenido desde el panel izquierdo para comenzar.</p>
          </div>
        ) : (
          <div className="group/track edge-fade-x -mx-1 px-1 flex gap-6 pb-6 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth">
            {edited.map((t, idx) => {
              const active = selectedSet === idx;
              return (
                <div
                  key={t.id ?? idx}
                  className={`
                    snap-center relative flex flex-col rounded-2xl border transition-all duration-300
                    ${active 
                        ? "bg-white border-sky-500 shadow-lg ring-1 ring-sky-500/20 shadow-sky-100 z-10" 
                        : "bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 opacity-90 hover:opacity-100"
                    }
                  `}
                  style={cardStyle}
                >
                  {/* Header Tarjeta */}
                  <div 
                    className={`
                        px-5 py-3 border-b flex items-center gap-3 cursor-pointer rounded-t-2xl transition-colors
                        ${active ? "bg-sky-50/50 border-sky-100" : "bg-slate-50 border-slate-100 hover:bg-slate-100"}
                    `}
                    onClick={() => setSelectedSet(idx)}
                  >
                    <div className={`
                        w-5 h-5 rounded-full border flex items-center justify-center transition-colors
                        ${active ? "border-sky-500 bg-sky-500" : "border-slate-300 bg-white"}
                    `}>
                        {active && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <span className={`text-sm font-bold ${active ? "text-sky-700" : "text-slate-600"}`}>
                      Opción {idx + 1}
                    </span>
                  </div>

                  {/* Cuerpo Tarjeta */}
                  <div className="p-5 space-y-5 flex-1 overflow-y-auto custom-scrollbar max-h-[650px]">
                    <div>
                      <label className={labelStyle}>Subject</label>
                      <textarea
                        className={inputBaseStyle}
                        rows={1}
                        onInput={autoResize}
                        style={{ minHeight: 54 }}
                        value={t.subject || ""}
                        onChange={(e) => updateSet(idx, { subject: e.target.value })}
                        placeholder="Escribe un asunto atractivo..."
                      />
                    </div>

                    <div>
                      <label className={labelStyle}>Pre-header</label>
                      <textarea
                        className={inputBaseStyle}
                        rows={1}
                        onInput={autoResize}
                        style={{ minHeight: 54 }}
                        value={t.preheader || ""}
                        onChange={(e) => updateSet(idx, { preheader: e.target.value })}
                        placeholder="Texto visible en la bandeja de entrada..."
                      />
                    </div>

                    <div className="pt-2 border-t border-slate-100"></div>

                    <div>
                      <label className={labelStyle}>Título Principal</label>
                      <textarea
                        className={`${inputBaseStyle} font-semibold text-lg`}
                        rows={1}
                        onInput={autoResize}
                        style={{ minHeight: 54 }}
                        value={t.body.title || ""}
                        onChange={(e) => updateSetBody(idx, { title: e.target.value })}
                        placeholder="El título principal del correo..."
                      />
                    </div>

                    <div>
                      <label className={labelStyle}>Bajada / Subtítulo</label>
                      <textarea
                        className={inputBaseStyle}
                        rows={1}
                        onInput={autoResize}
                        style={{ minHeight: 54 }}
                        value={t.body.subtitle || ""}
                        onChange={(e) => updateSetBody(idx, { subtitle: e.target.value })}
                        placeholder="Una frase corta complementaria..."
                      />
                    </div>

                    <div>
                      <label className={labelStyle}>Cuerpo del Mensaje</label>
                      <textarea
                        className={inputBaseStyle}
                        rows={6}
                        onInput={autoResize}
                        style={{ minHeight: 200 }}
                        value={t.body.content || ""}
                        onChange={(e) => updateSetBody(idx, { content: e.target.value })}
                        placeholder="Escribe el contenido completo aquí..."
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* IMÁGENES */}
      <section>
        <div className="mb-5 flex items-end justify-between px-1">
             <div>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                    Galería de Imágenes
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                    Selecciona la imagen Hero para tu campaña.
                </p>
            </div>
        </div>

        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
            <div className="text-4xl mb-3">🖼️</div>
            <p className="text-slate-400 text-sm">Aún no se han generado imágenes.</p>
          </div>
        ) : (
          <div className="flex gap-4 pb-4 overflow-x-auto snap-x snap-mandatory scroll-smooth">
            {images.map((img, idx) => {
              const active = selectedImage === idx;
              const hero = absoluteHeroUrl(batchId, img);
              return (
                <button
                  key={img.fileName ?? idx}
                  type="button"
                  onClick={() => setSelectedImage(idx)}
                  className={`
                    snap-start group relative flex-none w-[280px] rounded-2xl border transition-all duration-300 overflow-hidden text-left
                    ${active 
                        ? "ring-4 ring-sky-500/20 border-sky-500 shadow-lg scale-[1.02]" 
                        : "border-slate-200 shadow-sm hover:shadow-md hover:border-sky-200 hover:-translate-y-1"
                    }
                  `}
                >
                  <div className="relative aspect-[16/10] bg-slate-100">
                    <img
                      src={hero}
                      alt={`Imagen ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {active && (
                        <div className="absolute inset-0 bg-sky-900/10 flex items-center justify-center">
                            <div className="bg-white/90 rounded-full p-2 shadow-sm">
                                <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                        </div>
                    )}
                  </div>
                  
                  <div className={`px-3 py-2 text-xs border-t ${active ? "bg-sky-50 border-sky-100 text-sky-800" : "bg-white border-slate-100 text-slate-500"}`}>
                     <span className="font-medium truncate block w-full">
                        {img.fileName || `Imagen ${idx + 1}`}
                     </span>
                     {img.meta?.size && <span className="opacity-70 text-[10px]">{img.meta.size}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* PREVIEW interno (Opcional, si showInternalPreview=true) */}
      {showInternalPreview && (
        <section className="mt-10 pt-10 border-t border-slate-200">
          <h3 className="mb-5 text-lg font-bold text-slate-800">
            Previsualización
          </h3>

          {!preview ? (
            <div className="p-6 bg-slate-50 rounded-xl text-slate-500 text-sm text-center border border-slate-200">
              Faltan datos para generar la vista previa.
            </div>
          ) : (
            <EmailPreview
              subject={preview.subject}
              preheader={preview.preheader}
              title={preview.title || undefined}
              subtitle={preview.subtitle ?? undefined}
              body={preview.content}
              heroUrl={preview.heroUrl}
            />
          )}
        </section>
      )}
    </div>
  );
}