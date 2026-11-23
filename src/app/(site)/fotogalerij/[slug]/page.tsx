import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Camera, Download, Images, MousePointerClick } from "lucide-react";
import { AlbumCard } from "@/components/gallery/album-card";
import { LightboxGallery, type GalleryPhoto } from "@/components/gallery/lightbox-gallery";
import { EmptyState, PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { formatDate, siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

function absolute(url: string): string {
  return url.startsWith("http") ? url : siteUrl(url);
}

async function getAlbum(slug: string) {
  return prisma.album.findFirst({
    where: { slug, published: true },
    include: {
      event: { select: { title: true, slug: true } },
      photos: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const album = await getAlbum(slug);
  if (!album) return { title: "Album niet gevonden", robots: { index: false } };
  const cover = album.coverUrl ?? album.photos[0]?.url;
  const description =
    album.description?.slice(0, 160) || `${album.photos.length} foto's van ${album.title} (${formatDate(album.date)}) – MazdaClub Nederland.`;
  return {
    title: `${album.title} – fotoalbum`,
    description,
    alternates: { canonical: `/fotogalerij/${album.slug}` },
    openGraph: {
      title: album.title,
      description,
      type: "article",
      ...(cover ? { images: [{ url: absolute(cover), alt: album.title }] } : {}),
    },
  };
}

export default async function AlbumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const album = await getAlbum(slug);
  if (!album) notFound();

  const photos: GalleryPhoto[] = album.photos.map((p, i) => ({
    id: p.id,
    url: p.url,
    thumbUrl: p.thumbUrl,
    width: p.width,
    height: p.height,
    caption: p.caption,
    downloadName: `${album.slug}-${i + 1}.webp`,
  }));

  const moreAlbums = await prisma.album.findMany({
    where: { published: true, id: { not: album.id } },
    orderBy: { date: "desc" },
    take: 3,
    include: {
      event: { select: { title: true } },
      _count: { select: { photos: true } },
      photos: { select: { thumbUrl: true }, orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });

  const cover = album.coverUrl ?? album.photos[0]?.url;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: album.title,
    description: album.description ?? undefined,
    datePublished: album.date.toISOString(),
    url: siteUrl(`/fotogalerij/${album.slug}`),
    publisher: { "@type": "Organization", name: "MazdaClub Nederland", url: siteUrl() },
    image: album.photos.slice(0, 30).map((p) => ({
      "@type": "ImageObject",
      contentUrl: absolute(p.url),
      thumbnailUrl: absolute(p.thumbUrl),
      width: p.width,
      height: p.height,
      caption: p.caption ?? undefined,
    })),
  };

  return (
    <>
      <PageHeader
        eyebrow={formatDate(album.date, { weekday: "long" })}
        title={album.title}
        description={album.description ?? undefined}
        image={cover}
        breadcrumbs={[{ label: "Fotogalerij", href: "/fotogalerij" }, { label: album.title }]}
      >
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 font-medium backdrop-blur-sm">
            <Images className="size-4 text-primary" /> {album.photos.length} foto{album.photos.length === 1 ? "" : "'s"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 font-medium backdrop-blur-sm">
            <CalendarDays className="size-4 text-primary" /> {formatDate(album.date)}
          </span>
          {album.event && (
            <Link
              href={`/evenementen/${album.event.slug}`}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 font-semibold transition-colors hover:bg-primary-hover"
            >
              Bekijk evenement: {album.event.title}
            </Link>
          )}
        </div>
      </PageHeader>

      <section className="container-site py-12 sm:py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <Link href="/fotogalerij" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
            <ArrowLeft className="size-4" /> Terug naar alle albums
          </Link>
          {photos.length > 0 && (
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MousePointerClick className="size-4 text-primary" /> Klik op een foto om te vergroten
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Download className="size-4 text-primary" /> Download via de lichtbox
              </span>
            </p>
          )}
        </div>

        {photos.length > 0 ? (
          <LightboxGallery photos={photos} variant="grid" />
        ) : (
          <EmptyState icon={<Camera />} title="Dit album is nog leeg" description="De foto's worden binnenkort toegevoegd. Kom snel terug!" />
        )}

        <p className="mt-8 text-xs text-muted-foreground">
          Foto's zijn bedoeld voor persoonlijk gebruik. Sta je op een foto en wil je die laten verwijderen? Neem dan{" "}
          <Link href="/contact" className="font-medium text-primary underline underline-offset-2">
            contact
          </Link>{" "}
          met ons op.
        </p>
      </section>

      {moreAlbums.length > 0 && (
        <section className="bg-surface py-16 sm:py-20">
          <div className="container-site">
            <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow">Meer foto's</p>
                <h2 className="heading-md mt-3">Andere albums</h2>
              </div>
              <Button asChild variant="outline">
                <Link href="/fotogalerij">Alle albums</Link>
              </Button>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {moreAlbums.map((a) => (
                <AlbumCard
                  key={a.id}
                  album={{
                    slug: a.slug,
                    title: a.title,
                    date: a.date,
                    photoCount: a._count.photos,
                    coverUrl: a.coverUrl ?? a.photos[0]?.thumbUrl ?? null,
                    eventTitle: a.event?.title,
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
