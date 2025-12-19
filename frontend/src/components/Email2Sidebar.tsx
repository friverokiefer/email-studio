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
  generateEmailsV2,
  type GenerateV2Response,
  type GenerateV2Payload,
} from "@/lib/apiEmailV2";
import { listHistory, type HistoryBatch } from "@/lib/history";
import { extractBatchId, loadHistoryBatch } from "@/lib/historyLoader";
import { gcsBatchJsonUrl } from "@/lib/gcsPaths";
import { useSidebarForm } from "@/hooks/useSidebarForm";
import { ConfirmGenerateModal } from "@/components/ui/ConfirmGenerateModal";
import { Loader2, HelpCircle, Minus, Plus, Info } from "lucide-react";

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all disabled:opacity-50 disabled:bg-slate-50";
const textareaClass =
  inputClass + " resize-y leading-relaxed placeholder:text-slate-400 text-xs";

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
          {subtitle && (
            <span className="text-[10px] text-slate-500 font-normal mt-0.5">
              {subtitle}
            </span>
          )}
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
      {open && (
        <div className="px-4 pb-5 pt-3 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

const InfoTooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-flex items-center justify-center ml-1.5 cursor-help translate-y-0.5">
    <HelpCircle className="w-3.5 h-3.5 text-slate-300 hover:text-sky-600 transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] p-2 bg-slate-800 text-white text-[10px] font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 leading-snug text-center">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
    </div>
  </div>
);

const StepperInput = ({
  value,
  onChange,
  min = 1,
  max = 5,
}: {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    if (valStr === "") {
      onChange(NaN);
      return;
    }
    let val = parseInt(valStr);
    if (!isNaN(val)) {
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
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [activeBatchId, setActiveBatchId] = useState<string | undefined>(
    currentBatchId
  );
  const pendingTimers = useRef<number[]>([]);

  const prevCampaign = useRef(state.campaign);
  useEffect(() => {
    if (prevCampaign.current !== state.campaign) {
      setState((s) => ({ ...s, cluster: "" }));
      prevCampaign.current = state.campaign;
    }
  }, [state.campaign, setState]);

  useEffect(() => {
    return () => {
      pendingTimers.current.forEach((id) => clearTimeout(id));
    };
  }, []);

  useEffect(() => {
    if (currentBatchId) setActiveBatchId(currentBatchId);
  }, [currentBatchId]);

  useEffect(() => {
    if (!isGenerating || !startedAt) return;
    const t = window.setInterval(() => setElapsed(Date.now() - startedAt), 250);
    return () => clearInterval(t);
  }, [isGenerating, startedAt]);

  const refreshHistory = useCallback(async (silent = true) => {
    if (!silent) setIsHistoryLoading(true);
    try {
      const data = await listHistory("emails_v2");
      setHistory(data);
    } catch {
      if (!silent) toast.error("Error actualizando historial.");
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshHistory(false);
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
        temperature: state.temperature,
        imageQuality: state.imageQuality,
        feedback: {
          subject: state.feedbackSubject || "",
          preheader: state.feedbackPreheader || "",
          body: state.feedbackBody || "",
        },
      };

      const resp = await generateEmailsV2(payload);
      setActiveBatchId(resp.batchId);
      onGenerated?.(resp);

      setHistory((prev) => [
        { batchId: resp.batchId, count: resp.images?.length || 0 } as HistoryBatch,
        ...prev,
      ]);
      catchUpHistoryFor(resp.batchId);
      toast.success(
        `Lote ${resp.batchId} generado en ${formatDuration(Date.now() - startTime)}`
      );
    } catch (e: any) {
      toast.error(e?.message || "Error al generar.");
    } finally {
      setIsGenerating(false);
      setElapsed(Date.now() - startTime);
    }
  }

  async function handleLoadBatch(inputVal: string) {
    if (!inputVal) return;
    const bid = extractBatchId(inputVal) || inputVal.trim();
    if (!bid) return toast.error("ID no válido.");
    
    setIsHistoryLoading(true);
    const toastId = toast.loading("Cargando lote...");
    
    try {
      const resp = await loadHistoryBatch(bid);
      setActiveBatchId(resp.batchId);
      onGenerated?.(resp);
      toast.success(`Lote ${resp.batchId} cargado`, { id: toastId });
      refreshHistory(true);
    } catch (e: any) {
      toast.error(`Error: ${e.message}`, { id: toastId });
    } finally {
      setIsHistoryLoading(false);
    }
  }

  const filteredHistory = useMemo(() => {
    const q = query.trim().toLowerCase();
    return !q ? history : history.filter((h) => h.batchId.toLowerCase().includes(q));
  }, [history, query]);

  const batchJsonLink = activeBatchId ? gcsBatchJsonUrl(activeBatchId) : null;
  const isFormValid = Boolean(state.campaign && state.cluster);

  const selectedCampaignDesc = useMemo(
    () => availableCampaigns.find((c) => c.id === state.campaign)?.description,
    [state.campaign, availableCampaigns]
  );

  const selectedClusterDesc = useMemo(
    () => availableClusters.find((c) => c.id === state.cluster)?.description,
    [state.cluster, availableClusters]
  );

  const campaignPlaceholder = metaLoading 
    ? "Cargando catálogo..." 
    : metaError
      ? "Error cargando catálogo"
      : availableCampaigns.length === 0 
        ? "No hay campañas disponibles" 
        : "-- Selecciona --";

  return (
    <div className="font-sans space-y-6 pb-24 lg:pb-10">
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
              <a
                href={batchJsonLink}
                target="_blank"
                rel="noreferrer"
                className="text-sky-600 hover:underline font-medium"
              >
                JSON
              </a>
            )}
          </div>
        )}
      </div>

      <Collapsible title="📘 Selección de Campaña">
        {metaError && (
          <div className="p-2 bg-rose-50 text-rose-600 text-xs rounded-md">
            {metaError}
          </div>
        )}
        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 uppercase flex items-center">
              Campaña <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              className={inputClass}
              disabled={isGenerating || metaLoading || availableCampaigns.length === 0}
              value={state.campaign}
              onChange={(e) => setState((s) => ({ ...s, campaign: e.target.value }))}
            >
              <option value="" disabled>{campaignPlaceholder}</option>
              {availableCampaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            {selectedCampaignDesc && (
              <div className="mt-1.5 flex items-start gap-1.5 px-1">
                <Info className="w-3 h-3 text-sky-500 mt-0.5 shrink-0" />
                <p className="text-[10px] text-slate-500 leading-snug">{selectedCampaignDesc}</p>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 uppercase flex items-center">
              Segmento (Cluster) <span className="text-red-500 ml-1">*</span>
            </label>
            <div className={!state.campaign ? "opacity-60 cursor-not-allowed" : ""}>
              <select
                className={inputClass}
                disabled={isGenerating || !state.campaign || availableClusters.length === 0}
                value={state.cluster}
                onChange={(e) => setState((s) => ({ ...s, cluster: e.target.value }))}
              >
                <option value="" disabled>
                  {state.campaign
                    ? availableClusters.length === 0 ? "Sin clusters válidos" : "-- Selecciona --"
                    : "Primero selecciona campaña"}
                </option>
                {availableClusters.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              {selectedClusterDesc && (
                <div className="mt-1.5 flex items-start gap-1.5 px-1 animate-in fade-in duration-300">
                  <Info className="w-3 h-3 text-sky-500 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-slate-500 leading-snug">{selectedClusterDesc}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Collapsible>

      <Collapsible title="🧠 Instrucciones IA (Opcional)" subtitle="Dale pistas a la IA.">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Instrucciones Asunto</label>
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
            <label className="mb-1 block text-xs font-bold text-slate-700">Instrucciones Pre-header</label>
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
            <label className="mb-1 block text-xs font-bold text-slate-700">
              Instrucciones Cuerpo <InfoTooltip text="Guía el tono y elementos clave." />
            </label>
            <textarea
              className={textareaClass}
              rows={2}
              placeholder="Ej: Pareja joven comprando en un mall."
              onInput={autoGrow}
              value={state.feedbackBody}
              onChange={(e) => setState((s) => ({ ...s, feedbackBody: e.target.value }))}
            />
          </div>
        </div>
      </Collapsible>

      <Collapsible title="⚙️ Configuración">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-1 mb-2 min-h-[2rem]">
              <label className="text-xs font-bold text-slate-700 leading-tight">Opciones Texto</label>
              <InfoTooltip text="Variantes de texto a generar." />
            </div>
            <StepperInput
              value={state.setCount}
              onChange={(val) => setState((s) => ({ ...s, setCount: val }))}
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1 mb-2 min-h-[2rem]">
              <label className="text-xs font-bold text-slate-700 leading-tight">Imágenes</label>
              <InfoTooltip text="Cantidad de imágenes." />
            </div>
            <StepperInput
              value={state.imageCount}
              onChange={(val) => setState((s) => ({ ...s, imageCount: val }))}
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 mb-3">
          <label className="text-xs font-bold text-slate-700 mb-2 block">Calidad Imagen</label>
          <div className="grid grid-cols-3 gap-2">
            {(["low", "medium", "high"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setState(s => ({ ...s, imageQuality: v }))}
                className={`flex flex-col items-center py-2 rounded-lg border text-xs transition-all ${
                  state.imageQuality === v ? "bg-sky-50 border-sky-500 text-sky-700 shadow-sm" : "bg-white border-slate-200 text-slate-600"
                }`}
              >
                <span className="font-semibold">{v === 'low' ? 'Baja' : v === 'medium' ? 'Media' : 'Alta'}</span>
                <span className="text-[10px] opacity-70 font-mono">{v === 'low' ? '$' : v === 'medium' ? '$$' : '$$$'}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold text-slate-700">Creatividad IA</label>
            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              {state.temperature.toFixed(1)}
            </span>
          </div>
          <input
            type="range"
            min="0" max="1.2" step="0.1"
            value={state.temperature}
            onChange={(e) => setState(s => ({ ...s, temperature: parseFloat(e.target.value) }))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
          />
        </div>
      </Collapsible>

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
              disabled={!query || isHistoryLoading}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600"
            >
              CARGAR
            </button>
          </div>
          <div className="max-h-[200px] overflow-y-auto rounded-lg border border-slate-100">
            {isHistoryLoading ? (
              <div className="p-4 text-xs text-center flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-4 text-xs text-slate-400 text-center italic">Sin resultados</div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {filteredHistory.map((h) => (
                  <li
                    key={h.batchId}
                    className="flex justify-between items-center p-2 hover:bg-slate-50 group cursor-pointer"
                    onClick={() => handleLoadBatch(h.batchId)}
                  >
                    <div>
                      <div className="font-mono text-[10px] text-slate-600 group-hover:text-sky-600">{h.batchId}</div>
                      <div className="text-[9px] text-slate-400">{h.count ?? "-"} items</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Collapsible>

      <div className="sticky bottom-16 left-0 right-0 lg:static mt-4 border-t pt-4 bg-white lg:bg-transparent shadow-[0_-8px_20px_rgba(0,0,0,0.12)] lg:shadow-none -mx-4 px-4 lg:mx-0 lg:px-0 pb-4 lg:pb-0 z-30">
        <button
          onClick={handlePreGenerate}
          disabled={isGenerating || metaLoading || !isFormValid}
          className={`w-full rounded-2xl px-6 py-3.5 text-sm md:text-base font-semibold text-white transition flex items-center justify-center gap-2 ${
            isGenerating || metaLoading ? "bg-sky-400 cursor-wait" : !isFormValid ? "bg-slate-300 opacity-70" : "bg-sky-600 hover:bg-sky-700"
          }`}
        >
          {isGenerating ? <><Loader2 className="h-5 w-5 animate-spin" /> Generando...</> : metaLoading ? "Cargando..." : "Generar"}
        </button>
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
      <style>{`@keyframes loading { 0% { transform: translateX(-120%); } 50% { transform: translateX(40%); } 100% { transform: translateX(120%); } }`}</style>
    </div>
  );
}