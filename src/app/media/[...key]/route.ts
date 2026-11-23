import { readFile, stat } from "fs/promises";
import path from "path";
import { localUploadDir } from "@/lib/storage";

const TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

/** Serveert lokaal opgeslagen uploads (STORAGE_DRIVER=local). In productie bij voorkeur R2/S3 + CDN. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const root = localUploadDir();
  const target = path.resolve(root, ...key);
  if (!target.startsWith(root + path.sep)) return new Response("Niet gevonden", { status: 404 });

  const type = TYPES[path.extname(target).toLowerCase()];
  if (!type) return new Response("Niet gevonden", { status: 404 });

  try {
    const info = await stat(target);
    const file = await readFile(target);
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(info.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Niet gevonden", { status: 404 });
  }
}
