// frontend/src/lib/sfmcTemplate.ts
import type { PreviewData } from "@/components/Email2Workspace";

export function escapeHtml(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildSfmcHtmlTemplate(preview: PreviewData): string {
  const safeTitle = (preview.title || "").trim();
  const safeSubtitle = (preview.subtitle || "").trim();
  const safeBody = (preview.content || "").trim().replace(/\n/g, "<br/>");

  return [
    "<!DOCTYPE html>",
    "<html><body style='font-family:Arial, sans-serif; line-height:1.35;'>",
    `<h1 style='font-size:22px; margin:0 0 8px;'>${escapeHtml(safeTitle)}</h1>`,
    safeSubtitle
      ? `<p style='margin:0 0 12px; color:#555;'>${escapeHtml(safeSubtitle)}</p>`
      : "",
    `<img src='{{IMAGE_URL}}' alt='Hero' width='600' style='max-width:100%; border-radius:8px; display:block; margin:8px 0 16px;'/>`,
    `<div style='font-size:14px;'>${safeBody}</div>`,
    "</body></html>",
  ].join("");
}