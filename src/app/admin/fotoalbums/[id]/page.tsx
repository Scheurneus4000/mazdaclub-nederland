import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { deleteAlbum } from "@/app/admin/actions/albums";
import { AlbumForm } from "@/components/admin/album-forms";
import { AlbumPhotoGrid } from "@/components/admin/album-photo-grid";
import { ConfirmActionDialog } from "@/components/admin/confirm-action-dialog";
import { AdminPageHeader, AdminSection } from "@/components/admin/page-title";
import { PhotoUploader } from "@/components/admin/photo-uploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/form-controls";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Fotoalbum" };
export const dynamic = "force-dynamic";

export default async function AdminAlbumDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;

  const [album, events] = await Promise.all([
    prisma.album.findUnique({ where: { id }, include: { photos: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } } }),
    prisma.event.findMany({ orderBy: { startsAt: "desc" }, take: 100, select: { id: true, title: true, startsAt: true } }),
  ]);
  if (!album) notFound();

  return (
    <>
      <AdminPageHeader
        title={album.title}
        badge={album.published ? <Badge variant="success">Zichtbaar</Badge> : <Badge variant="secondary">Verborgen</Badge>}
        description={`${formatDate(album.date)} · ${album.photos.length} foto's`}
        back={{ href: "/admin/fotoalbums", label: "Fotoalbums" }}
        actions={
          album.published ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/fotogalerij/${album.slug}`} target="_blank">
                <ExternalLink /> Bekijk album
              </Link>
            </Button>
          ) : undefined
        }
      />
      {sp.aangemaakt && (
        <Alert variant="success" className="mb-6">
          Album aangemaakt. Upload hieronder de foto's.
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <AdminSection title="Foto's uploaden" description="Sleep foto's in het vak of klik op de knop. Grote foto's worden automatisch verkleind.">
            <PhotoUploader albumId={album.id} />
          </AdminSection>

          <AdminSection
            title={`Foto's (${album.photos.length})`}
            description="Pas bijschriften en volgorde aan, kies een omslagfoto, vervang een foto of selecteer er meerdere om te verwijderen."
          >
            <AlbumPhotoGrid
              albumId={album.id}
              coverUrl={album.coverUrl}
              photos={album.photos.map((p) => ({
                id: p.id,
                url: p.url,
                thumbUrl: p.thumbUrl,
                caption: p.caption,
                width: p.width,
                height: p.height,
                sizeBytes: p.sizeBytes,
              }))}
            />
          </AdminSection>
        </div>

        <div className="space-y-6">
          <AdminSection title="Albumgegevens">
            <AlbumForm key={album.updatedAt.toISOString()} album={album} events={events} />
          </AdminSection>
          <AdminSection title="Album verwijderen" description="Verwijdert het album én alle foto's definitief uit de opslag.">
            <ConfirmActionDialog
              action={deleteAlbum}
              fields={{ id: album.id }}
              title={`Album "${album.title}" verwijderen?`}
              description={
                <>
                  <p>
                    Het album en alle {album.photos.length} foto&apos;s worden definitief verwijderd. Bezoekers kunnen het album daarna niet meer bekijken of
                    downloaden.
                  </p>
                  <p>Dit kun je niet ongedaan maken.</p>
                </>
              }
              requireText="VERWIJDER"
              confirmLabel="Album definitief verwijderen"
            >
              <Trash2 /> Album verwijderen
            </ConfirmActionDialog>
          </AdminSection>
        </div>
      </div>
    </>
  );
}
