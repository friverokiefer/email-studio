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

export function useSfmcDraftSender() {
  const [isUploading, setIsUploading] = useState(false);
  const [sfmcNotice, setSfmcNotice] = useState<string | null>(null);

  async function sendToSfmc({
    batchId,
    livePreview,
    contentSets,
    images,
    editedRef,
  }: UseSfmcSenderProps) {
    if (!batchId || !livePreview) return;

    setIsUploading(true);
    setSfmcNotice(null);

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

      // 4. Notificar éxito
      const msg = [
          "✅ Enviado a SFMC.",
          res.result?.step?.uploadImage?.publishedURL
            ? `Imagen publicada: ${res.result.step.uploadImage.publishedURL}`
            : "",
          res.result?.step?.createEmailDraft?.id
            ? `Email ID: ${res.result.step.createEmailDraft.id}`
            : "",
          res.result?.step?.createEmailDraft?.customerKey
            ? `CustomerKey: ${res.result.step.createEmailDraft.customerKey}`
            : "",
        ]
        .filter(Boolean)
        .join(" ");
        
      setSfmcNotice(msg);
      toast.success("Borrador de email creado en SFMC.");
      return true; // Indicar éxito
    } catch (e: any) {
      toast.error(e?.message || "Error enviando a SFMC.");
      return false;
    } finally {
      setIsUploading(false);
    }
  }

  return {
    isUploading,
    sfmcNotice,
    setSfmcNotice, // Por si el padre necesita resetearlo
    sendToSfmc,
  };
}