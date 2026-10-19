"use client";

import { LIMITS } from "@/lib/config";
import { getBrowserClient } from "@/lib/supabase/client";

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Shrinks a photo to at most 2048px on the long side and re-encodes it as JPEG (~80%).
 * Falls back to the original file if the browser can't decode it (e.g. HEIC on some phones).
 */
export async function compressImage(
  file: File,
  { maxSide = LIMITS.imageMaxSide, quality = LIMITS.imageQuality, skipBelowBytes = 0 } = {},
): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (skipBelowBytes && file.size < skipBelowBytes) return file;
  try {
    const img = await loadImage(file);
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

function extFor(blob: Blob, fallbackName?: string) {
  const fromType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "audio/webm": "webm",
    "audio/mp4": "m4a",
    "audio/ogg": "ogg",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
  };
  const base = blob.type.split(";")[0];
  return fromType[base] ?? fallbackName?.split(".").pop() ?? "bin";
}

/** Uploads to `<bucket>/<folder>/<uuid>.<ext>` and returns the storage path */
export async function uploadFile(bucket: string, folder: string, blob: Blob, name?: string) {
  const path = `${folder}/${crypto.randomUUID()}.${extFor(blob, name)}`;
  const { error } = await getBrowserClient()
    .storage.from(bucket)
    .upload(path, blob, { contentType: blob.type || undefined, upsert: false });
  if (error) throw error;
  return path;
}

async function fetchBlob(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  return res.blob();
}

function saveBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export interface DownloadItem {
  url: string;
  filename: string;
}

export async function downloadOne(item: DownloadItem) {
  saveBlob(await fetchBlob(item.url), item.filename);
}

/** Carousels: all slides in one zip file */
export async function downloadZip(items: DownloadItem[], zipName: string) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const blobs = await Promise.all(items.map((i) => fetchBlob(i.url)));
  blobs.forEach((b, i) => zip.file(items[i].filename, b));
  saveBlob(await zip.generateAsync({ type: "blob" }), zipName);
}

/** Opens the phone's share sheet with the files attached (WhatsApp, Instagram, ...). */
export async function shareFiles(
  items: DownloadItem[],
  text: string,
): Promise<"shared" | "unsupported" | "cancelled"> {
  if (typeof navigator === "undefined" || !navigator.share) return "unsupported";
  try {
    const files = await Promise.all(
      items.map(async (i) => {
        const b = await fetchBlob(i.url);
        return new File([b], i.filename, { type: b.type });
      }),
    );
    const data: ShareData = files.length ? { files, text } : { text };
    if (files.length && navigator.canShare && !navigator.canShare(data)) {
      await navigator.share({ text });
      return "shared";
    }
    await navigator.share(data);
    return "shared";
  } catch (e) {
    return e instanceof DOMException && e.name === "AbortError" ? "cancelled" : "unsupported";
  }
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

export async function celebrate() {
  const { default: confetti } = await import("canvas-confetti");
  const css = getComputedStyle(document.documentElement);
  const colors = ["--status", "--primary", "--rose-ink"].map((v) => css.getPropertyValue(v).trim()).filter(Boolean);
  // short burst (well under a second); skipped entirely for people who ask for less motion
  confetti({ particleCount: 70, spread: 70, startVelocity: 35, ticks: 90, origin: { y: 0.7 }, colors, disableForReducedMotion: true });
}
