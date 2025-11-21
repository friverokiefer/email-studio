// frontend/src/lib/previewSelectors.ts
import type { PreviewData, EmailContentSet } from "@/components/Email2Workspace";
import type { EmailV2Image } from "@/lib/apiEmailV2";

export function resolveSelectedImage(
  live: PreviewData | null,
  images: EmailV2Image[]
): { fileName: string | null; heroUrl: string; meta?: EmailV2Image["meta"] } {
  if (!live || !live.heroUrl) {
    return { fileName: null, heroUrl: live?.heroUrl || "" };
  }

  let found = images.find((im) => im.heroUrl && im.heroUrl === live.heroUrl);
  if (found) {
    return {
      fileName: found.fileName || null,
      heroUrl: live.heroUrl,
      meta: found.meta,
    };
  }

  found = images.find((im) => {
    const fname = im.fileName ? encodeURIComponent(im.fileName) : "";
    return (
      fname &&
      (live.heroUrl.includes(`/${fname}`) || live.heroUrl.endsWith(fname))
    );
  });

  if (found) {
    return {
      fileName: found.fileName || null,
      heroUrl: live.heroUrl,
      meta: found.meta,
    };
  }

  return { fileName: null, heroUrl: live.heroUrl };
}

export function resolveSelectedSet(
  live: PreviewData | null,
  edited: EmailContentSet[] | null,
  base: EmailContentSet[]
): { index: number | null; set: EmailContentSet | null } {
  const source = edited && edited.length ? edited : base;
  if (!live || source.length === 0) {
    return { index: null, set: null };
  }

  const i = source.findIndex(
    (t) =>
      (t.subject || "") === live.subject &&
      (t.preheader || "") === live.preheader &&
      (t.body?.content || "") === live.content
  );

  if (i >= 0) {
    return { index: i, set: source[i] };
  }
  return { index: null, set: null };
}

export function detectImageExtensionFrom(
  src: string,
  fallback: "png" | "jpg" | "jpeg" | "gif" = "png"
) {
  const s = (src || "").toLowerCase();
  if (/\.(png)(\?|#|$)/.test(s)) return "png";
  if (/\.(jpe?g)(\?|#|$)/.test(s)) return s.includes(".jpeg") ? "jpeg" : "jpg";
  if (/\.(gif)(\?|#|$)/.test(s)) return "gif";
  return fallback;
}