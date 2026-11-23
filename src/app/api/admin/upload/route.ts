import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminOrNull } from "@/lib/session";
import {
  ALLOWED_IMAGE_TYPES,
  deleteObject,
  looksLikeSvg,
  MAX_SVG_BYTES,
  MAX_UPLOAD_BYTES,
  SVG_TYPE,
  uploadOptimizedImage,
  uploadSiteImage,
  type OptimizedImage,
} from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FOLDERS = ["albums", "products", "events", "news", "site"] as const;
type Folder = (typeof FOLDERS)[number];
const MAX_FILES_PER_REQUEST = 30;

type UploadResult = { url: string; thumbUrl: string; width: number; height: number; key: string; thumbKey: string; photoId?: string };

function isFile(value: FormDataEntryValue): value is File {
  return typeof value === "object" && value !== null && "arrayBuffer" in value && "size" in value;
}

function field(form: FormData, name: string): string | null {
  const v = form.get(name);
  return typeof v === "string" && v ? v : null;
}

function toResult(img: OptimizedImage, photoId?: string): UploadResult {
  return { url: img.url, thumbUrl: img.thumbUrl, width: img.width, height: img.height, key: img.key, thumbKey: img.thumbKey, ...(photoId ? { photoId } : {}) };
}

function revalidateAlbumPaths(album: { id: string; slug: string }) {
  revalidatePath(`/admin/fotoalbums/${album.id}`);
  revalidatePath("/fotogalerij");
  revalidatePath(`/fotogalerij/${album.slug}`);
  revalidatePath("/");
}

/**
 * POST multipart/form-data
 *   files           – één of meer afbeeldingen (JPG/PNG/WebP/AVIF/HEIC, max. 15 MB per stuk; map "site" ook SVG)
 *   folder          – "albums" | "products" | "events" | "news" | "site"
 *   albumId         – optioneel: maakt direct Photo-records aan in dit album
 *   replacePhotoId  – optioneel: vervangt de afbeelding van deze foto (één bestand); bijschrift, volgorde en album blijven
 *   variant         – optioneel, alleen map "site": "favicon" → vierkante PNG 512×512
 * Antwoord: { files: UploadResult[], errors?: [{ name, error }] }
 */
export async function POST(req: Request) {
  const admin = await getAdminOrNull();
  if (!admin) return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek (mogelijk is het bestand te groot)" }, { status: 400 });
  }

  const folder = String(form.get("folder") ?? "") as Folder;
  if (!FOLDERS.includes(folder)) return NextResponse.json({ error: "Ongeldige map" }, { status: 400 });
  const variant = folder === "site" && field(form, "variant") === "favicon" ? "favicon" : undefined;

  const files = form.getAll("files").filter(isFile).filter((f) => f.size > 0);
  if (files.length === 0) return NextResponse.json({ error: "Geen bestanden ontvangen" }, { status: 400 });
  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json({ error: `Maximaal ${MAX_FILES_PER_REQUEST} bestanden per keer` }, { status: 400 });
  }

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const subfolder = `${folder}/${month}`;

  // ── Eén bestaande foto vervangen ──
  const replacePhotoId = field(form, "replacePhotoId");
  if (replacePhotoId) {
    if (files.length !== 1) return NextResponse.json({ error: "Kies precies één foto om te vervangen" }, { status: 400 });
    const photo = await prisma.photo.findUnique({ where: { id: replacePhotoId }, include: { album: { select: { id: true, slug: true, coverUrl: true } } } });
    if (!photo) return NextResponse.json({ error: "Foto niet gevonden" }, { status: 404 });
    const file = files[0];
    const invalid = validateFile(file, folder);
    if (invalid) return NextResponse.json({ files: [], errors: [{ name: file.name, error: invalid }] }, { status: 422 });

    let img: OptimizedImage;
    try {
      img = await uploadOptimizedImage(Buffer.from(await file.arrayBuffer()), `albums/${month}`);
    } catch (err) {
      console.error("[upload] vervangen mislukt", file.name, err);
      return NextResponse.json({ files: [], errors: [{ name: file.name, error: "Afbeelding kon niet worden verwerkt (beschadigd of niet-ondersteund formaat)" }] }, { status: 422 });
    }

    await prisma.photo.update({
      where: { id: photo.id },
      data: { url: img.url, thumbUrl: img.thumbUrl, storageKey: img.key, thumbKey: img.thumbKey, width: img.width, height: img.height, sizeBytes: img.sizeBytes },
    });
    if (photo.album.coverUrl && (photo.album.coverUrl === photo.thumbUrl || photo.album.coverUrl === photo.url)) {
      await prisma.album.update({ where: { id: photo.album.id }, data: { coverUrl: img.thumbUrl } });
    }
    await Promise.all([deleteObject(photo.storageKey), deleteObject(photo.thumbKey)]);
    revalidateAlbumPaths(photo.album);
    return NextResponse.json({ files: [toResult(img, photo.id)] });
  }

  // ── Nieuwe uploads ──
  const albumId = field(form, "albumId");
  const album = albumId ? await prisma.album.findUnique({ where: { id: albumId }, select: { id: true, slug: true, coverUrl: true } }) : null;
  if (albumId && !album) return NextResponse.json({ error: "Album niet gevonden" }, { status: 404 });

  let nextSort = album ? ((await prisma.photo.aggregate({ where: { albumId: album.id }, _max: { sortOrder: true } }))._max.sortOrder ?? -1) + 1 : 0;
  let coverUrl = album?.coverUrl ?? null;

  const results: UploadResult[] = [];
  const errors: Array<{ name: string; error: string }> = [];

  for (const file of files) {
    const invalid = validateFile(file, folder);
    if (invalid) {
      errors.push({ name: file.name, error: invalid });
      continue;
    }
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const isSvg = file.type === SVG_TYPE;
      if (isSvg && !looksLikeSvg(buffer)) {
        errors.push({ name: file.name, error: "Dit is geen geldig SVG-bestand" });
        continue;
      }
      const img = folder === "site" ? await uploadSiteImage(buffer, subfolder, { svg: isSvg, variant }) : await uploadOptimizedImage(buffer, subfolder);
      const result = toResult(img);
      if (album) {
        const photo = await prisma.photo.create({
          data: {
            albumId: album.id,
            url: img.url,
            thumbUrl: img.thumbUrl,
            storageKey: img.key,
            thumbKey: img.thumbKey,
            width: img.width,
            height: img.height,
            sizeBytes: img.sizeBytes,
            sortOrder: nextSort++,
          },
        });
        result.photoId = photo.id;
        if (!coverUrl) {
          coverUrl = img.thumbUrl;
          await prisma.album.update({ where: { id: album.id }, data: { coverUrl } });
        }
      }
      results.push(result);
    } catch (err) {
      console.error("[upload] verwerken mislukt", file.name, err);
      errors.push({ name: file.name, error: "Afbeelding kon niet worden verwerkt (beschadigd of niet-ondersteund formaat)" });
    }
  }

  if (album && results.length > 0) revalidateAlbumPaths(album);

  return NextResponse.json(
    { files: results, ...(errors.length ? { errors } : {}) },
    { status: results.length > 0 ? 200 : 422 },
  );
}

function validateFile(file: File, folder: Folder): string | null {
  if (file.type === SVG_TYPE) {
    if (folder !== "site") return "SVG is alleen toegestaan voor logo's en website-afbeeldingen";
    if (file.size > MAX_SVG_BYTES) return "SVG-bestand is groter dan 2 MB";
    return null;
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return "Bestandstype niet ondersteund (gebruik JPG, PNG, WebP of AVIF)";
  if (file.size > MAX_UPLOAD_BYTES) return "Bestand is groter dan 15 MB";
  return null;
}
