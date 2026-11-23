import type { Metadata } from "next";
import Link from "next/link";
import { Images } from "lucide-react";
import { AlbumForm } from "@/components/admin/album-forms";
import { AdminPageHeader, AdminSection } from "@/components/admin/page-title";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/form-controls";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Fotoalbums" };
export const dynamic = "force-dynamic";

export default async function AdminAlbumsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const [albums, events, photoStats] = await Promise.all([
    prisma.album.findMany({
      orderBy: { date: "desc" },
      include: { _count: { select: { photos: true } }, event: { select: { title: true } } },
    }),
    prisma.event.findMany({ orderBy: { startsAt: "desc" }, take: 100, select: { id: true, title: true, startsAt: true } }),
    prisma.photo.aggregate({ _count: { _all: true }, _sum: { sizeBytes: true } }),
  ]);
  const mb = ((photoStats._sum.sizeBytes ?? 0) / 1024 / 1024).toFixed(1).replace(".", ",");

  return (
    <>
      <AdminPageHeader
        title="Fotoalbums"
        description={`${albums.length} albums · ${photoStats._count._all} foto's · ${mb} MB aan geoptimaliseerde beelden`}
      />
      {sp.verwijderd && (
        <Alert variant="success" className="mb-6">
          Het album en de bijbehorende foto's zijn verwijderd.
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          {albums.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-white px-6 py-16 text-center">
              <Images className="size-8 text-primary" />
              <p className="mt-3 font-semibold">Nog geen albums</p>
              <p className="mt-1 text-sm text-muted-foreground">Maak rechts je eerste album aan en upload daarna de foto's.</p>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {albums.map((a) => (
                <li key={a.id}>
                  <Link href={`/admin/fotoalbums/${a.id}`} className="group block overflow-hidden rounded-xl border border-border bg-white shadow-xs transition-shadow hover:shadow-md">
                    <div className="relative aspect-[16/10] bg-muted">
                      {a.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.coverUrl} alt="" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted-foreground">
                          <Images className="size-8" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3 flex gap-1.5">
                        {!a.published && <Badge variant="dark">Verborgen</Badge>}
                        <Badge variant="secondary" className="bg-white/90">
                          {a._count.photos} foto's
                        </Badge>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="font-semibold group-hover:text-primary">{a.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(a.date)}
                        {a.event && ` · ${a.event.title}`}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <AdminSection title="Nieuw album" description="Na het aanmaken kun je direct foto's uploaden.">
            <AlbumForm events={events} />
          </AdminSection>
          <AdminSection title="Zo werkt het">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Maak een album aan, bijvoorbeeld per rit of evenement.</li>
              <li>Upload de foto&apos;s: sleep ze in het uploadvak of kies ze van je computer of telefoon.</li>
              <li>Foto&apos;s worden automatisch verkleind, omgezet naar een snel formaat en ontdaan van locatiegegevens.</li>
              <li>Bezoekers kunnen de foto&apos;s groot bekijken en downloaden.</li>
            </ol>
          </AdminSection>
        </div>
      </div>
    </>
  );
}
