import "server-only";
import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";

/**
 * Bestandsopslag met twee drivers:
 *  - "s3":    Cloudflare R2 of AWS S3 (aanbevolen voor productie)
 *  - "local": schijf (LOCAL_UPLOAD_DIR), geserveerd via /media/[...key]
 */

const driver = () => (process.env.STORAGE_DRIVER || "local").toLowerCase();

let s3: S3Client | null = null;
function s3Client(): S3Client {
  s3 ??= new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  });
  return s3;
}

export function localUploadDir(): string {
  return path.resolve(process.cwd(), process.env.LOCAL_UPLOAD_DIR || "./storage/uploads");
}

export function publicUrlForKey(key: string): string {
  if (driver() === "s3") return `${(process.env.S3_PUBLIC_URL || "").replace(/\/$/, "")}/${key}`;
  return `/media/${key}`;
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<string> {
  if (driver() === "s3") {
    await s3Client().send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } else {
    const target = path.join(localUploadDir(), key);
    if (!target.startsWith(localUploadDir())) throw new Error("Ongeldig pad");
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);
  }
  return publicUrlForKey(key);
}

export async function deleteObject(key: string | null | undefined): Promise<void> {
  if (!key) return;
  try {
    if (driver() === "s3") {
      await s3Client().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
    } else {
      const target = path.join(localUploadDir(), key);
      if (target.startsWith(localUploadDir())) await unlink(target);
    }
  } catch (err) {
    console.warn("[opslag] verwijderen mislukt", key, err);
  }
}

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"];
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export type OptimizedImage = {
  url: string;
  thumbUrl: string;
  key: string;
  thumbKey: string;
  width: number;
  height: number;
  sizeBytes: number;
};

/**
 * Automatische optimalisatie: draait volgens EXIF, verwijdert metadata (incl. GPS – AVG),
 * schaalt naar max. 2400px (groot) en 640px (thumbnail) en zet om naar WebP.
 */
export async function uploadOptimizedImage(input: Buffer, folder: string): Promise<OptimizedImage> {
  const id = randomUUID();
  const base = sharp(input, { failOn: "error" }).rotate();

  const large = await base
    .clone()
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  const thumb = await base.clone().resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).webp({ quality: 74 }).toBuffer();

  const key = `${folder}/${id}.webp`;
  const thumbKey = `${folder}/${id}-thumb.webp`;
  const [url, thumbUrl] = await Promise.all([putObject(key, large.data, "image/webp"), putObject(thumbKey, thumb, "image/webp")]);

  return { url, thumbUrl, key, thumbKey, width: large.info.width, height: large.info.height, sizeBytes: large.info.size };
}

export const SVG_TYPE = "image/svg+xml";
export const MAX_SVG_BYTES = 2 * 1024 * 1024;

/** Eenvoudige controle dat een bestand echt een SVG-document is (geen HTML of iets anders). */
export function looksLikeSvg(input: Buffer): boolean {
  const head = input.subarray(0, 2048).toString("utf8").replace(/^﻿/, "").trimStart();
  return /^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(head);
}

/**
 * Logo's en andere website-afbeeldingen (map "site").
 * - SVG wordt altijd omgezet naar WebP (met transparantie); de ruwe SVG wordt nooit opgeslagen (XSS-risico).
 * - variant "favicon": vierkante PNG van 512×512 met transparante achtergrond.
 * - Overige formaten: zoals uploadOptimizedImage (WebP behoudt transparantie).
 */
export async function uploadSiteImage(input: Buffer, folder: string, opts: { svg?: boolean; variant?: "favicon" } = {}): Promise<OptimizedImage> {
  let density: number | undefined;
  if (opts.svg) {
    // Kies de resolutie zó dat de langste zijde ± 1600 px wordt (minimaal 300 dpi).
    const meta = await sharp(input).metadata();
    const longest = Math.max(meta.width ?? 0, meta.height ?? 0) || 100;
    density = Math.min(2400, Math.max(300, Math.round((72 * 1600) / longest)));
  }
  const base = sharp(input, { failOn: "error", ...(density ? { density } : {}) }).rotate();
  const id = randomUUID();

  if (opts.variant === "favicon") {
    const png = await base
      .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toBuffer({ resolveWithObject: true });
    const key = `${folder}/${id}-favicon.png`;
    const url = await putObject(key, png.data, "image/png");
    return { url, thumbUrl: url, key, thumbKey: key, width: png.info.width, height: png.info.height, sizeBytes: png.info.size };
  }

  if (!opts.svg) return uploadOptimizedImage(input, folder);

  const large = await base
    .clone()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 90, alphaQuality: 100 })
    .toBuffer({ resolveWithObject: true });
  const thumb = await base.clone().resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).webp({ quality: 85, alphaQuality: 100 }).toBuffer();
  const key = `${folder}/${id}.webp`;
  const thumbKey = `${folder}/${id}-thumb.webp`;
  const [url, thumbUrl] = await Promise.all([putObject(key, large.data, "image/webp"), putObject(thumbKey, thumb, "image/webp")]);
  return { url, thumbUrl, key, thumbKey, width: large.info.width, height: large.info.height, sizeBytes: large.info.size };
}
