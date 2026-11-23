/**
 * next/image weigert externe hosts die niet in next.config.ts staan. Daarom accepteren we in het
 * beheer alleen afbeeldingen van eigen opslag (/media, /images), R2/S3 en Unsplash.
 */
export function isAllowedImageUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const host = u.hostname;
    let storageHost: string | null = null;
    try {
      storageHost = process.env.S3_PUBLIC_URL ? new URL(process.env.S3_PUBLIC_URL).hostname : null;
    } catch {
      storageHost = null;
    }
    return host === "images.unsplash.com" || host === storageHost || host.endsWith(".r2.dev") || host.endsWith(".amazonaws.com");
  } catch {
    return false;
  }
}

export const imageUrlHint = "Upload een afbeelding of gebruik een URL van de eigen opslag (R2/S3) of images.unsplash.com.";
