import type { Metadata } from "next";
import Link from "next/link";
import { Camera, ChevronLeft, ChevronRight } from "lucide-react";
import { AlbumCard } from "@/components/gallery/album-card";
import { EmptyState, PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { getContent } from "@/lib/content";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fotogalerij",
  description: "Bekijk en download de mooiste foto's van toerritten, Mazda Meetings en clubevenementen van MazdaClub Nederland.",
  alternates: { canonical: "/fotogalerij" },
};

const PER_PAGE = 24;

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const { pagina } = await searchParams;
  const page = Math.max(1, Number.parseInt(pagina ?? "1", 10) || 1);

  const [content, total, albums] = await Promise.all([
    getContent(),
    prisma.album.count({ where: { published: true } }),
    prisma.album.findMany({
      where: { published: true },
      orderBy: { date: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        event: { select: { title: true } },
        _count: { select: { photos: true } },
        photos: { select: { thumbUrl: true }, orderBy: { sortOrder: "asc" }, take: 1 },
      },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const totalPhotos = await prisma.photo.count({ where: { album: { published: true } } });

  return (
    <>
      <PageHeader
        eyebrow="Fotogalerij"
        title={content.pageGalleryTitle}
        description={content.pageGalleryText}
        image={content.pageGalleryImage || undefined}
        breadcrumbs={[{ label: "Fotogalerij" }]}
      >
        <div className="flex flex-wrap gap-8 text-sm">
          <div>
            <p className="font-display text-3xl font-bold">{total}</p>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/60">Albums</p>
          </div>
          <div>
            <p className="font-display text-3xl font-bold">{totalPhotos}</p>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/60">Foto's</p>
          </div>
        </div>
      </PageHeader>

      <section className="container-site py-16 sm:py-20">
        {albums.length === 0 ? (
          <EmptyState
            icon={<Camera />}
            title="Nog geen albums"
            description="Na de eerstvolgende rit of meeting verschijnen hier de mooiste foto's. Rij je mee?"
            action={
              <Button asChild>
                <Link href="/evenementen">Bekijk evenementen</Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {albums.map((album) => (
                <AlbumCard
                  key={album.id}
                  album={{
                    slug: album.slug,
                    title: album.title,
                    date: album.date,
                    photoCount: album._count.photos,
                    coverUrl: album.coverUrl ?? album.photos[0]?.thumbUrl ?? null,
                    eventTitle: album.event?.title,
                  }}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <nav className="mt-14 flex items-center justify-center gap-2" aria-label="Paginering">
                <Button asChild={page > 1} variant="outline" size="icon" disabled={page <= 1} aria-label="Vorige pagina">
                  {page > 1 ? (
                    <Link href={`/fotogalerij?pagina=${page - 1}`}>
                      <ChevronLeft />
                    </Link>
                  ) : (
                    <ChevronLeft />
                  )}
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <Link
                    key={n}
                    href={`/fotogalerij?pagina=${n}`}
                    aria-current={n === page ? "page" : undefined}
                    className={cn(
                      "flex size-10 items-center justify-center rounded-md border text-sm font-semibold transition-colors",
                      n === page ? "border-primary bg-primary text-white" : "border-border hover:bg-muted",
                    )}
                  >
                    {n}
                  </Link>
                ))}
                <Button asChild={page < totalPages} variant="outline" size="icon" disabled={page >= totalPages} aria-label="Volgende pagina">
                  {page < totalPages ? (
                    <Link href={`/fotogalerij?pagina=${page + 1}`}>
                      <ChevronRight />
                    </Link>
                  ) : (
                    <ChevronRight />
                  )}
                </Button>
              </nav>
            )}
          </>
        )}
      </section>
    </>
  );
}
