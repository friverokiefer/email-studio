// frontend/src/components/Email2Sidebar.tsx
import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { toast } from "sonner";
import {
  type GenerateV2Response,
  generateEmailsV2,
  type GenerateV2Payload,
} from "@/lib/apiEmailV2";
import { listHistory, type HistoryBatch } from "@/lib/history";
import { extractBatchId, loadHistoryBatch } from "@/lib/historyLoader";
import { gcsBatchJsonUrl } from "@/lib/gcsPaths";
import { useSidebarForm } from "@/hooks/useSidebarForm";
import { ConfirmGenerateModal } from "@/components/ui/ConfirmGenerateModal";
import { Loader2, HelpCircle, Minus, Plus } from "lucide-react";

/* =========================
 * UI Helpers
 * ========================= */
const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all disabled:opacity-50 disabled:bg-slate-50";
const textareaClass = inputClass + " resize-y leading-relaxed placeholder:text-slate-400 text-xs";

function autoGrow(e: React.FormEvent<HTMLTextAreaElement>) {
  const el = e.currentTarget;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function formatDuration(ms: number) {
  if (!ms || ms < 0) return "0s";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return m === 0 ? `${ss}s` : `${m}m ${ss.toString().padStart(2, "0")}s`;
}

function Collapsible({
  title,
  subtitle,
  children,
  defaultOpen = true,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-slate-50/50 hover:bg-slate-50 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex flex-col">
           <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
             {title}
           </span>
           {subtitle && <span className="text-[10px] text-slate-500 font-normal mt-0.5">{subtitle}</span>}
        </div>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.185l3.71-3.954a.75.75 0 111.08 1.04l-4.24 4.52a.75.75 0 01-1.08 0l-4.24-4.52a.75.75 0 01.02-1.06z" />
        </svg>
      </button>
      {open && <div className="px-4 pb-5 pt-3 space-y-4 animate-in slide-in-from-top-2 duration-200">{children}</div>}
    </div>
  );
}

// Tooltip mejorado
const InfoTooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-flex items-center justify-center ml-1.5 cursor-help translate-y-0.5">
    <HelpCircle className="w-3.5 h-3.5 text-slate-300 hover:text-sky-600 transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] p-2 bg-slate-800 text-white text-[10px] font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 leading-snug text-center">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
    </div>
  </div>
);

// Input numérico con controles Stepper (+/-)
const StepperInput = ({ 
  value, 
  onChange, 
  min = 1, 
  max = 5 
}: { 
  value: number; 
  onChange: (val: number) => void; 
  min?: number; 
  max?: number 
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    
    // Si está vacío, permitimos borrar para UX
    if (valStr === "") {
      onChange(NaN); 
      return;
    }

    let val = parseInt(valStr);
    
    if (!isNaN(val)) {
        // Lógica "anti-salto"
        if (val > max) {
            const lastDigit = parseInt(valStr.slice(-1));
            if (!isNaN(lastDigit) && lastDigit >= min && lastDigit <= max) {
                val = lastDigit;
            } else {
                val = max;
            }
        }
        onChange(val);
    }
  };

  const handleBlur = () => {
    // Restaurar valor seguro al perder foco
    if (isNaN(value) || value < min) onChange(min);
    if (value > max) onChange(max);
  };

  return (
    <div className="relative flex items-center">
      <button 
        type="button"
        onClick={() => onChange(Math.max(min, (value || min) - 1))}
        className="absolute left-2 text-slate-400 hover:text-sky-600 disabled:opacity-30 transition-colors p-1"
        disabled={value <= min}
      >
        <Minus className="w-3 h-3" />
      </button>
      
      <input
        type="text" 
        inputMode="numeric"
        className={`${inputClass} text-center px-8 font-semibold text-slate-700`}
        value={isNaN(value) ? "" : value}
        onChange={handleInputChange}
        onBlur={handleBlur}
      />

      <button 
        type="button"
        onClick={() => onChange(Math.min(max, (value || min) + 1))}
        className="absolute right-2 text-slate-400 hover:text-sky-600 disabled:opacity-30 transition-colors p-1"
        disabled={value >= max}
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
};

/* =========================
 * Componente Principal
 * ========================= */
export function Email2Sidebar({
  onGenerated,
  currentBatchId,
}: {
  onGenerated?: (resp: GenerateV2Response) => void;
  currentBatchId?: string;
}) {
  const {
    state,
    setState,
    metaLoading,
    metaError,
    availableCampaigns,
    availableClusters,
    meta,
  } = useSidebarForm();

  const [isGenerating, setIsGenerating] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);
  const elapsedLabel = useMemo(() => formatDuration(elapsed), [elapsed]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [history, setHistory] = useState<HistoryBatch[]>([]);
  const [query, setQuery] = useState("");
  const [activeBatchId, setActiveBatchId] = useState<string | undefined>(
    currentBatchId,
  );
  const pendingTimers = useRef<number[]>([]);

  // Bugfix: Limpiar cluster al cambiar campaña
  const prevCampaign = useRef(state.campaign);
  useEffect(() => {
    if (prevCampaign.current !== state.campaign) {
      setState(s => ({ ...s, cluster: "" }));
      prevCampaign.current = state.campaign;
    }
  }, [state.campaign, setState]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      pendingTimers.current.forEach((id) => clearTimeout(id));
    };
  }, []);

  // Sync batch activo desde props
  useEffect(() => {
    if (currentBatchId) setActiveBatchId(currentBatchId);
  }, [currentBatchId]);

  // Cronómetro visual
  useEffect(() => {
    if (!isGenerating || !startedAt) return;
    const t = window.setInterval(
      () => setElapsed(Date.now() - startedAt),
      250,
    );
    return () => clearInterval(t);
  }, [isGenerating, startedAt]);

  // Cargar Historial
  const refreshHistory = useCallback(async (silent = true) => {
    try {
      const data = await listHistory("emails_v2");
      setHistory(data);
    } catch {
      if (!silent) toast.error("Error actualizando historial.");
    }
  }, []);

  useEffect(() => {
    refreshHistory(true);
  }, [refreshHistory]);

  const catchUpHistoryFor = useCallback((targetBatchId: string) => {
    const delays = [700, 1500, 3500];
    const run = async () => {
      try {
        const data = await listHistory("emails_v2");
        setHistory(data);
        if (data.some((h) => h.batchId === targetBatchId)) {
          pendingTimers.current.forEach((id) => clearTimeout(id));
        }
      } catch { /* ignore */ }
    };
    delays.forEach((ms) => {
      const id = window.setTimeout(run, ms);
      pendingTimers.current.push(id);
    });
  }, []);

  // --- ACCIONES ---

  function handlePreGenerate() {
    if (!meta) return toast.error("Catálogo no cargado.");
    if (!state.campaign || !state.cluster)
      return toast.warning("Selecciona Campaña y Cluster.");
    setConfirmOpen(true);
  }

  async function handleConfirmGenerate() {
    setConfirmOpen(false);
    setIsGenerating(true);
    const startTime = Date.now();
    setStartedAt(startTime);
    setElapsed(0);

    try {
      const payload: GenerateV2Payload = {
        campaign: state.campaign,
        cluster: state.cluster,
        sets: state.setCount,
        images: state.imageCount,
        feedback: {
          subject: state.feedbackSubject || undefined,
          preheader: state.feedbackPreheader || undefined,
          body: state.feedbackBody || undefined,
        } as any,
      };

      const resp = await generateEmailsV2(payload);
      setActiveBatchId(resp.batchId);
      onGenerated?.(resp);

      setHistory((prev) => [
        { batchId: resp.batchId, count: resp.images?.length || 0 } as HistoryBatch,
        ...prev,
      ]);
      catchUpHistoryFor(resp.batchId);
      toast.success(`Lote ${resp.batchId} generado en ${formatDuration(Date.now() - startTime)}`);
    } catch (e: any) {
      toast.error(e?.message || "Error al generar.");
    } finally {
      setIsGenerating(false);
      setElapsed((prev) => (prev === 0 ? Date.now() - startTime : prev));
    }
  }

  async function handleLoadBatch(inputVal: string) {
    if (!inputVal) return;
    const bid = extractBatchId(inputVal) || inputVal.trim();
    if (!bid) return toast.error("ID no válido.");
    const toastId = toast.loading("Cargando lote...");
    try {
      const resp = await loadHistoryBatch(bid);
      setActiveBatchId(resp.batchId);
      onGenerated?.(resp);
      toast.success(`Lote ${resp.batchId} cargado`, { id: toastId });
      refreshHistory(true);
    } catch (e: any) {
      toast.error(`Error: ${e.message}`, { id: toastId });
    }
  }

  const filteredHistory = useMemo(() => {
    const q = query.trim().toLowerCase();
    return !q ? history : history.filter((h) => h.batchId.toLowerCase().includes(q));
  }, [history, query]);

  const batchJsonLink = activeBatchId ? gcsBatchJsonUrl(activeBatchId) : null;
  const isFormValid = state.campaign && state.cluster;

  return (
    <div className="font-sans space-y-6 pb-10">
      {/* Header */}
      <div className="space-y-3 pb-1">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">
            Configuración Email
          </h3>
          <div className="flex items-center gap-2">
            {isGenerating && (
              <span className="text-[10px] font-bold bg-sky-100 text-sky-700 px-2 py-1 rounded-full animate-pulse border border-sky-200">
                GENERANDO {elapsedLabel}
              </span>
            )}
            {!isGenerating && activeBatchId && (
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200">
                LISTO
              </span>
            )}
          </div>
        </div>

        {activeBatchId && (
          <div className="mx-1 px-3 py-2 bg-slate-100 rounded-lg text-xs text-slate-600 flex justify-between items-center group hover:bg-slate-200 transition-colors">
            <span className="font-mono truncate max-w-[180px]" title={activeBatchId}>
              {activeBatchId}
            </span>
            {batchJsonLink && (
              <a href={batchJsonLink} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline font-medium">
                JSON
              </a>
            )}
          </div>
        )}
      </div>

      {/* 1. Selección Base */}
      <Collapsible title="📘 Selección de Campaña">
        {metaError && (
          <div className="p-2 bg-rose-50 text-rose-600 text-xs rounded-md">{metaError}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 uppercase flex items-center">
              Campaña <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              className={inputClass}
              disabled={isGenerating || metaLoading}
              value={state.campaign}
              onChange={(e) => setState((s) => ({ ...s, campaign: e.target.value }))}
            >
              <option value="" disabled>-- Selecciona --</option>
              {availableCampaigns.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 uppercase flex items-center">
              Cluster / Segmento <span className="text-red-500 ml-1">*</span>
            </label>
            <div className={!state.campaign ? "opacity-60 cursor-not-allowed" : ""}>
                <select
                className={inputClass}
                disabled={isGenerating || !state.campaign}
                value={state.cluster}
                onChange={(e) => setState((s) => ({ ...s, cluster: e.target.value }))}
                >
                <option value="" disabled>{state.campaign ? "-- Selecciona --" : "Primero selecciona campaña"}</option>
                {availableClusters.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
            </div>
          </div>
        </div>
      </Collapsible>

      {/* 2. Instrucciones IA */}
      <Collapsible 
        title="🧠 Instrucciones IA (Opcional)" 
        subtitle="Dale pistas a la IA para afinar el tono o contenido."
      >
        <div className="space-y-4">
          
          <div>
            <div className="flex justify-between items-center mb-1">
                <label className="flex items-center text-xs font-bold text-slate-700">
                  Instrucciones Asunto
                </label>
            </div>
            <textarea
              className={textareaClass}
              rows={2}
              placeholder="Ej: Destaca urgencia: '¡Solo por 72 horas!'."
              onInput={autoGrow}
              value={state.feedbackSubject}
              onChange={(e) => setState((s) => ({ ...s, feedbackSubject: e.target.value }))}
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
                <label className="flex items-center text-xs font-bold text-slate-700">
                  Instrucciones Pre-header
                </label>
            </div>
            <textarea
              className={textareaClass}
              rows={2}
              placeholder="Ej: Fecha límite: 30 de noviembre."
              onInput={autoGrow}
              value={state.feedbackPreheader}
              onChange={(e) => setState((s) => ({ ...s, feedbackPreheader: e.target.value }))}
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
                <label className="flex items-center text-xs font-bold text-slate-700">
                  Instrucciones Cuerpo
                  <InfoTooltip text="Guía la estructura, tono y elementos clave del correo a generar." />
                </label>
            </div>
            <textarea
              className={textareaClass}
              rows={2}
              placeholder="Ej: Pareja joven y feliz comprando en un mall, usando su tarjeta."
              onInput={autoGrow}
              value={state.feedbackBody}
              onChange={(e) => setState((s) => ({ ...s, feedbackBody: e.target.value }))}
            />
          </div>
        </div>
      </Collapsible>

      {/* 3. Configuración */}
      <Collapsible title="⚙️ Configuración">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-1 mb-2 min-h-[2rem]">
                <label className="block text-xs font-bold text-slate-700 leading-tight">
                  Opciones de texto a generar
                </label>
                <InfoTooltip text="Opciones distintas de texto a generar." />
            </div>
            <StepperInput 
              value={state.setCount}
              onChange={(val) => setState(s => ({...s, setCount: val}))}
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1 mb-2 min-h-[2rem]">
                <label className="block text-xs font-bold text-slate-700 leading-tight">
                  Imágenes
                </label>
                <InfoTooltip text="Cantidad de imágenes a generar." />
            </div>
            <StepperInput 
              value={state.imageCount}
              onChange={(val) => setState(s => ({...s, imageCount: val}))}
            />
          </div>
        </div>
      </Collapsible>

      {/* 4. Historial */}
      <Collapsible title="🕓 Historial" defaultOpen={false}>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="Buscar ID..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLoadBatch(query)}
            />
            <button
              onClick={() => handleLoadBatch(query)}
              disabled={!query}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-colors"
            >
              CARGAR
            </button>
          </div>

          <div className="max-h-[200px] overflow-y-auto rounded-lg border border-slate-100">
            {filteredHistory.length === 0 ? (
              <div className="p-4 text-xs text-slate-400 text-center italic">
                Sin resultados
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {filteredHistory.map((h) => (
                  <li
                    key={h.batchId}
                    className="flex justify-between items-center p-2 hover:bg-slate-50 group cursor-pointer"
                    onClick={() => handleLoadBatch(h.batchId)}
                  >
                    <div>
                      <div className="font-mono text-[10px] text-slate-600 font-medium group-hover:text-sky-600 transition-colors">
                        {h.batchId}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        {h.count ?? "-"} items
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Collapsible>

      {/* Footer */}
      <div className="mt-4 border-t pt-4 bg-white/95">
        <button
          onClick={handlePreGenerate}
          disabled={isGenerating || metaLoading || !isFormValid}
          className={`
            w-full rounded-2xl px-6 py-3.5 text-sm md:text-base font-semibold text-white shadow-sm transition flex items-center justify-center gap-2
            ${
              isGenerating || metaLoading
                ? "bg-sky-400 cursor-wait"
                : !isFormValid 
                    ? "bg-slate-300 cursor-not-allowed opacity-70"
                    : "bg-sky-600 hover:bg-sky-700 active:scale-[0.99]"
            }
          `}
          title={!isFormValid ? "Selecciona Campaña y Cluster para generar" : ""}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Generando...</span>
            </>
          ) : metaLoading ? (
            "Cargando catálogo..."
          ) : (
            "Generar"
          )}
        </button>

        {isGenerating && (
          <div className="mt-3 w-full">
            <div className="mt-2 h-1.5 overflow-hidden rounded bg-neutral-200">
                <div className="h-full w-1/3 animate-[loading_1.4s_ease-in-out_infinite] rounded bg-sky-500" />
            </div>
          </div>
        )}
      </div>

      <ConfirmGenerateModal
        open={confirmOpen}
        busy={isGenerating}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmGenerate}
        summary={{
          campaign: state.campaign,
          cluster: state.cluster,
          sets: state.setCount,
          images: state.imageCount,
        }}
      />

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-120%); }
          50% { transform: translateX(40%); }
          100% { transform: translateX(120%); }
        }
      `}</style>
    </div>
  );
}