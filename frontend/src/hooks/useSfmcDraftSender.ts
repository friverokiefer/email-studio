// frontend/src/hooks/useSfmcDraftSender.ts
import { useState } from "react";
import { toast } from "sonner";
import {
  postSfmcDraftEmail,
  type SfmcDraftEmailPayload,
} from "@/lib/apiEmailV2";
import { gcsDirectObjectUrl } from "@/lib/gcsPaths";
import { buildSfmcHtmlTemplate } from "@/lib/sfmcTemplate";
import {
  resolveSelectedImage,
  resolveSelectedSet,
  detectImageExtensionFrom,
} from "@/lib/previewSelectors";
import type { PreviewData, EmailContentSet } from "@/components/Email2Workspace";
import type { EmailV2Image } from "@/lib/apiEmailV2";

const VITE_SFMC_CATEGORY_ID = Number(
  (import.meta as any).env?.VITE_SFMC_CATEGORY_ID || NaN
);

interface UseSfmcSenderProps {
  batchId: string;
  livePreview: PreviewData | null;
  contentSets: EmailContentSet[];
  images: EmailV2Image[];
  editedRef: React.MutableRefObject<EmailContentSet[] | null>;
}

// NUEVO: Estructura de datos para el éxito
export interface SfmcSuccessData {
  imageUrl?: string;
  emailId?: number | string;
  customerKey?: string;
  timestamp: string;
}

export function useSfmcDraftSender() {
  const [isUploading, setIsUploading] = useState(false);
  
  // CAMBIO: Ahora guardamos el objeto completo, no un string
  const [sfmcSuccess, setSfmcSuccess] = useState<SfmcSuccessData | null>(null);

  async function sendToSfmc({
    batchId,
    livePreview,
    contentSets,
    images,
    editedRef,
  }: UseSfmcSenderProps) {
    if (!batchId || !livePreview) return;

    setIsUploading(true);
    setSfmcSuccess(null); // Limpiar estado anterior

    try {
      // 1. Resolver datos finales
      const { index: setIndex, set } = resolveSelectedSet(
        livePreview,
        editedRef.current,
        contentSets
      );
      const imgInfo = resolveSelectedImage(livePreview, images);

      // 2. Configurar payload
      const categoryId =
        Number.isFinite(VITE_SFMC_CATEGORY_ID) && VITE_SFMC_CATEGORY_ID > 0
          ? VITE_SFMC_CATEGORY_ID
          : 339292;

      const gcsUrl =
        imgInfo.fileName && batchId
          ? gcsDirectObjectUrl(batchId, imgInfo.fileName) ?? undefined
          : undefined;

      const ext = detectImageExtensionFrom(
        imgInfo.fileName || imgInfo.heroUrl || "",
        "png"
      );

      const emailName = `email_${batchId}_${Date.now()}`;
      const htmlTemplate = buildSfmcHtmlTemplate(livePreview);

      const payload: SfmcDraftEmailPayload = {
        categoryId,
        image: {
          name: imgInfo.fileName || "hero",
          extension: ext,
          gcsUrl: gcsUrl || livePreview.heroUrl,
        },
        email: {
          name: emailName,
          subject: livePreview.subject,
          preheader: livePreview.preheader,
          htmlTemplate,
        },
        batch: {
          id: batchId,
          meta: {
            setIndex,
            setId: set?.id ?? null,
          },
        },
        dryRun: false,
      };

      // 3. Enviar
      const res = await postSfmcDraftEmail(payload);
      if (!res.ok) throw new Error(res.error || "Falla en envío SFMC");

      // 4. Guardar datos estructurados (CAMBIO CLAVE)
      const successData: SfmcSuccessData = {
        imageUrl: res.result?.step?.uploadImage?.publishedURL,
        emailId: res.result?.step?.createEmailDraft?.id,
        customerKey: res.result?.step?.createEmailDraft?.customerKey,
        timestamp: new Date().toLocaleTimeString(),
      };

      setSfmcSuccess(successData);
      toast.success("Borrador creado en Salesforce Marketing Cloud.");
      return true;
    } catch (e: any) {
      toast.error(e?.message || "Error enviando a SFMC.");
      return false;
    } finally {
      setIsUploading(false);
    }
  }

  return {
    isUploading,
    sfmcSuccess,   // Exponemos el objeto
    setSfmcSuccess, 
    sendToSfmc,
  };
}