// frontend/src/components/Email2Workspace.tsx
import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import type { EmailV2Image, EmailContentSet } from "@/lib/apiEmailV2";
import { EmailPreview } from "./EmailPreview";
import { ManualImageDropzone } from "./ManualImageDropzone";

export type { EmailContentSet } from "@/lib/apiEmailV2";

export type PreviewData = {
  subject: string;
  preheader: string;
  title: string;
  subtitle: string | null;
  content: string;
  heroUrl: string;
};

// === Config GCS ===
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
  const path = pathJoinAndEncode(
    VITE_GCS_PREFIX,
    "emails_v2",
    batchId,
    fileName
  );
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

function normalizeSets(
  arr: EmailContentSet[] | undefined | null
): EmailContentSet[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((t) => normalizeSet(t));
}

/** === COMPONENTE === */
export function Email2Workspace({
  batchId,
  trios,
  images,
  showInternalPreview = true,
  onPreviewChange,
  onEditedChange,
  onImagesChange,
}: {
  batchId: string;
  trios: EmailContentSet[];
  images: EmailV2Image[];
  showInternalPreview?: boolean;
  onPreviewChange?: (data: PreviewData | null) => void;
  onEditedChange?: (sets: EmailContentSet[]) => void;
  onImagesChange?: (images: EmailV2Image[]) => void; // callback opcional para actualizar imágenes en el padre
}) {
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

  // Reset al cambiar el batch
  useEffect(() => {
    if (prevBatchRef.current !== batchId) {
      prevBatchRef.current = batchId;
      const norm = normalizeSets(trios);
      setEdited(norm);
      setSelectedSet(norm.length ? 0 : null);
      setSelectedImage(images.length ? 0 : null);
    }
  }, [batchId, trios, images]);

  // Sincronizar selección de imagen cuando cambie la lista
  useEffect(() => {
    if (prevBatchRef.current !== batchId) return;
    setSelectedImage((prev) => {
      const len = images.length;
      if (len === 0) return null;
      if (prev == null) return 0;
      return prev >= len ? len - 1 : prev;
    });
  }, [images, batchId]);

  // Notificar cambios de texto al padre
  useEffect(() => {
    onEditedChange?.(edited);
  }, [edited, onEditedChange]);

  // Updates de texto
  const updateSet = (idx: number, patch: Partial<EmailContentSet>) => {
    setEdited((prev) => {
      const next = [...prev];
      next[idx] = normalizeSet({ ...next[idx], ...patch });
      return next;
    });
  };

  const updateSetBody = (
    idx: number,
    patch: Partial<EmailContentSet["body"]>
  ) => {
    setEdited((prev) => {
      const next = [...prev];
      next[idx] = normalizeSet({
        ...next[idx],
        body: { ...next[idx].body, ...patch },
      });
      return next;
    });
  };

  const autoResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  // Cuando el Dropzone sube una imagen manual
  const handleImageUploaded = useCallback(
    (img: EmailV2Image) => {
      const next = [...images, img];
      onImagesChange?.(next);
      // UX: seleccionar automáticamente la nueva imagen como activa
      setSelectedImage(next.length - 1);
    },
    [images, onImagesChange]
  );

  // Preview
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

  useEffect(() => {
    onPreviewChange?.(preview);
  }, [preview, onPreviewChange]);

  // Compact styles
  const labelStyle =
    "mb-0.5 block text-[7px] font-medium text-slate-500 uppercase tracking-wider";
  const inputBaseStyle =
    "w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 resize-y leading-relaxed hover:border-slate-300 shadow-sm";

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="mx-auto flex w-full max-w-[840px] flex-col px-3 lg:px-3.5 py-2 lg:py-3.5">
        {/* ====================== */}
        {/* SETS DE CONTENIDO      */}
        {/* ====================== */}
        <section className="mb-3">
          <div className="sticky top-0 z-30 -mx-3 lg:-mx-3.5 px-3 lg:px-3.5 py-1.5 bg-slate-50/95 backdrop-blur-md mb-2.5 border-b border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">✍️</span>
              <div>
                <h3 className="text-[13px] font-semibold text-slate-800 tracking-tight">
                  Editor de Texto
                </h3>
                <p className="text-[9px] text-slate-500">
                  Selecciona y edita una variante.
                </p>
              </div>
            </div>
            {edited.length > 0 && (
              <div className="text-[9px] font-semibold bg-white text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
                {edited.length} variantes
              </div>
            )}
          </div>

          {edited.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 p-5 text-center min-h-[180px]">
              <div className="text-3xl mb-2 opacity-30">📝</div>
              <h4 className="text-slate-500 font-medium text-xs">
                Esperando generación...
              </h4>
            </div>
          ) : (
            <div className="group/track flex gap-2.5 pb-3 overflow-x-auto snap-x snap-mandatory scroll-smooth px-0.5">
              {edited.map((t, idx) => {
                const active = selectedSet === idx;

                return (
                  <div
                    key={idx}
                    className={`
                      snap-start flex-none flex flex-col rounded-2xl border transition-all duration-300 bg-white
                      ${
                        active
                          ? "border-sky-500 shadow-md shadow-sky-100/60 z-10 ring-1 ring-sky-500/20 scale-[1.01]"
                          : "border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300"
                      }
                    `}
                    style={{ width: "300px" }}
                  >
                    {/* HEADER */}
                    <div
                      className={`
                        px-3 py-2 border-b flex items-center justify-between cursor-pointer rounded-t-2xl transition-colors
                        ${
                          active
                            ? "bg-sky-50/40 border-sky-100"
                            : "bg-white border-slate-50 hover:bg-slate-50"
                        }
                      `}
                      onClick={() => setSelectedSet(idx)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`
                            w-4 h-4 rounded-full border flex items-center justify-center
                            ${
                              active
                                ? "border-sky-500 bg-sky-500 text-white"
                                : "border-slate-300 bg-white text-transparent"
                            }
                          `}
                        >
                          <div className="w-1.5 h-1.5 bg-current rounded-full" />
                        </div>
                        <span
                          className={`text-[10px] font-medium ${
                            active ? "text-sky-700" : "text-slate-600"
                          }`}
                        >
                          Opción {idx + 1}
                        </span>
                      </div>

                      {active && (
                        <span className="text-[8px] font-bold uppercase bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded tracking-wide">
                          Editando
                        </span>
                      )}
                    </div>

                    {/* CAMPOS */}
                    <div className="p-3 space-y-2.5 bg-slate-50/30 flex-1">
                      {/* SUBJECT */}
                      <div>
                        <label className={labelStyle}>Asunto (Subject)</label>
                        <textarea
                          className={inputBaseStyle}
                          rows={2}
                          onInput={autoResize}
                          style={{ minHeight: 48 }}
                          value={t.subject || ""}
                          onChange={(e) =>
                            updateSet(idx, { subject: e.target.value })
                          }
                        />
                      </div>

                      {/* PREHEADER */}
                      <div>
                        <label className={labelStyle}>Pre-header</label>
                        <textarea
                          className={inputBaseStyle}
                          rows={2}
                          onInput={autoResize}
                          style={{ minHeight: 48 }}
                          value={t.preheader || ""}
                          onChange={(e) =>
                            updateSet(idx, { preheader: e.target.value })
                          }
                        />
                      </div>

                      <div className="h-px bg-slate-200" />

                      {/* TITLE */}
                      <div>
                        <label className={labelStyle}>Título principal</label>
                        <textarea
                          className={inputBaseStyle}
                          rows={2}
                          onInput={autoResize}
                          style={{ minHeight: 48 }}
                          value={t.body.title || ""}
                          onChange={(e) =>
                            updateSetBody(idx, { title: e.target.value })
                          }
                        />
                      </div>

                      {/* SUBTITLE */}
                      <div>
                        <label className={labelStyle}>Bajada</label>
                        <textarea
                          className={inputBaseStyle}
                          rows={5}
                          onInput={autoResize}
                          style={{ minHeight: 110 }}
                          value={t.body.subtitle || ""}
                          onChange={(e) =>
                            updateSetBody(idx, { subtitle: e.target.value })
                          }
                        />
                      </div>

                      {/* CONTENT */}
                      <div>
                        <label className={labelStyle}>Cuerpo del mensaje</label>
                        <textarea
                          className={inputBaseStyle}
                          rows={15}
                          onInput={autoResize}
                          style={{ minHeight: 275 }} // ≈ 15 líneas
                          value={t.body.content || ""}
                          onChange={(e) =>
                            updateSetBody(idx, { content: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ====================== */}
        {/* IMÁGENES               */}
        {/* ====================== */}
        <section className="pt-2 border-t border-slate-200 pb-8">
          {/* Título principal de la sección de imágenes */}
          <div className="sticky top-0 z-20 -mx-3 lg:-mx-3.5 px-3 lg:px-3.5 py-1.5 bg-slate-50/95 backdrop-blur-md mb-2 border-b border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🖼️</span>
              <div>
                <h3 className="text-[13px] font-semibold text-slate-800 tracking-tight">
                  Galería de Imágenes
                </h3>
                <p className="text-[9px] text-slate-500">
                  Selecciona la imagen Hero generada por la IA o cargada
                  manualmente para este batch.
                </p>
              </div>
            </div>
            {images.length > 0 && (
              <span className="text-[9px] text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
                {images.length} opciones
              </span>
            )}
          </div>

          {/* Galería de imágenes */}
          {images.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 p-4 text-center h-28">
              <div className="text-3xl mb-2 opacity-30">🖼️</div>
              <p className="text-slate-400 text-xs">Sin imágenes aún.</p>
            </div>
          ) : (
            <div className="flex gap-2.5 pb-3 overflow-x-auto snap-x snap-mandatory scroll-smooth px-0.5">
              {images.map((img, idx) => {
                const active = selectedImage === idx;
                const hero = absoluteHeroUrl(batchId, img);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(idx)}
                    className={`
                      snap-start group relative flex-none rounded-2xl overflow-hidden border-2 transition-all duration-200 aspect-video bg-white shadow-sm text-left
                      ${
                        active
                          ? "border-sky-500 ring-4 ring-sky-500/10 shadow-xl -translate-y-[2px]"
                          : "border-transparent hover:border-slate-300 hover:shadow-md"
                      }
                    `}
                    style={{ width: "300px" }}
                  >
                    <img
                      src={hero}
                      alt={`Imagen ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    <div
                      className={`absolute top-2 right-2 rounded-full p-1.5 transition-all duration-200 ${
                        active
                          ? "bg-sky-500 text-white scale-100 shadow-lg"
                          : "bg-black/40 text-white/70 scale-90 group-hover:scale-100"
                      }`}
                    >
                      {active ? (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-current" />
                      )}
                    </div>

                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-white text-[9px] font-medium truncate font-mono">
                        {img.fileName}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ============================ */}
          {/* CARGA MANUAL DE IMÁGENES     */}
          {/* ============================ */}
          {batchId && (
            <div className="mt-4 pt-3 border-t border-dashed border-slate-200 space-y-2">
              <div className="flex items-center px-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">📂</span>
                  <div>
                    <h4 className="text-[12px] font-semibold text-slate-800 tracking-tight">
                      Carga manual de imágenes
                    </h4>
                    <p className="text-[9px] text-slate-500">
                      Usa esta sección para añadir assets finales o aprobados
                      fuera de la IA. Se guardan en el mismo batch y quedarán
                      marcados como{" "}
                      <span className="font-mono">manual-upload</span>.
                    </p>
                  </div>
                </div>
              </div>

              <ManualImageDropzone
                batchId={batchId}
                onUploaded={handleImageUploaded}
              />
            </div>
          )}
        </section>

        {/* MOBILE PREVIEW */}
        {showInternalPreview && preview && (
          <section className="mt-3 pt-3 border-t border-slate-200 lg:hidden pb-8">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Previsualización móvil
            </h3>
            <EmailPreview
              subject={preview.subject}
              preheader={preview.preheader}
              title={preview.title || undefined}
              subtitle={preview.subtitle ?? undefined}
              body={preview.content}
              heroUrl={preview.heroUrl}
            />
          </section>
        )}
      </div>
    </div>
  );
}
