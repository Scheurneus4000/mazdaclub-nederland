/** Client-helper: upload één bestand naar /api/admin/upload met voortgang (XHR). */
export type UploadedFile = {
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  key: string;
  thumbKey: string;
  photoId?: string;
};

export type UploadFolder = "albums" | "products" | "events" | "news" | "site";

export type UploadFields = {
  folder: UploadFolder;
  albumId?: string;
  /** Vervangt de afbeelding van een bestaande foto (bijschrift en volgorde blijven). */
  replacePhotoId?: string;
  /** Alleen map "site": maakt een vierkante PNG van 512×512 voor het favicon. */
  variant?: "favicon";
};

/** Hosting zoals Vercel accepteert max. 4,5 MB per verzoek; we blijven daar ruim onder. */
const RESIZABLE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_EDGE = 3200;
const RESIZE_ABOVE_BYTES = 3 * 1024 * 1024;
const TARGET_MAX_BYTES = 4 * 1024 * 1024;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Verkleint grote foto's in de browser vóór het uploaden (max. 3200 px, JPEG 90%).
 * PNG's en website-afbeeldingen (logo's) worden WebP zodat transparantie behouden blijft.
 * Formaten die de browser niet kan lezen (HEIC/AVIF) en SVG gaan ongewijzigd door; de server optimaliseert altijd zelf.
 */
export async function prepareImageForUpload(file: File, folder: UploadFolder): Promise<File> {
  if (typeof window === "undefined" || typeof createImageBitmap !== "function" || !RESIZABLE_TYPES.includes(file.type)) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    if (file.size <= RESIZE_ABOVE_BYTES && longest <= MAX_EDGE) return file;

    const keepAlpha = folder === "site" || file.type === "image/png";
    const outType = keepAlpha ? "image/webp" : "image/jpeg";
    let edge = Math.min(MAX_EDGE, longest);

    for (let attempt = 0; attempt < 4; attempt++) {
      const scale = edge / longest;
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      if (!keepAlpha) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, width, height);

      const blob = await canvasToBlob(canvas, outType, 0.9);
      if (!blob) return file;
      if (blob.size <= TARGET_MAX_BYTES || attempt === 3) {
        // Geen winst en het origineel is al klein genoeg: origineel houden.
        if (blob.size >= file.size && longest <= MAX_EDGE) return file;
        const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
        const name = `${file.name.replace(/\.[^.]+$/, "") || "afbeelding"}.${ext}`;
        return new File([blob], name, { type: blob.type || outType, lastModified: file.lastModified });
      }
      edge = Math.round(edge * 0.8);
    }
    return file;
  } finally {
    bitmap.close();
  }
}

export async function uploadFile(file: File, fields: UploadFields, onProgress?: (percent: number) => void): Promise<UploadedFile> {
  const prepared = await prepareImageForUpload(file, fields.folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");
    xhr.responseType = "text";
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status === 413) {
        reject(new Error("Dit bestand is te groot om te uploaden. Sla de foto op als JPG of verklein hem en probeer het opnieuw."));
        return;
      }
      try {
        const data = JSON.parse(xhr.responseText || "{}") as {
          files?: UploadedFile[];
          errors?: Array<{ name: string; error: string }>;
          error?: string;
        };
        if (xhr.status >= 200 && xhr.status < 300 && data.files?.[0]) resolve(data.files[0]);
        else reject(new Error(data.errors?.[0]?.error || data.error || "Uploaden mislukt"));
      } catch {
        reject(new Error(xhr.status === 401 ? "Je bent niet (meer) ingelogd als beheerder" : "Uploaden mislukt"));
      }
    };
    xhr.onerror = () => reject(new Error("Netwerkfout tijdens uploaden"));
    const fd = new FormData();
    fd.append("files", prepared);
    fd.append("folder", fields.folder);
    if (fields.albumId) fd.append("albumId", fields.albumId);
    if (fields.replacePhotoId) fd.append("replacePhotoId", fields.replacePhotoId);
    if (fields.variant) fd.append("variant", fields.variant);
    xhr.send(fd);
  });
}
