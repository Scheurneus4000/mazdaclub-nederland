import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Newspaper } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/layout/page-header";
import { NewsCard } from "@/components/news/news-card";
import { Button } from "@/components/ui/button";
import { getContent } from "@/lib/content";
import { getPublishedNews, NEWS_PAGE_SIZE } from "@/lib/news";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nieuws",
  description: "Het laatste nieuws van MazdaClub Nederland: aankondigingen, verslagen van ritten en Mazda Meetings, en nieuws voor leden.",
  alternates: { canonical: "/nieuws" },
};

function pageHref(n: number) {
  return n > 1 ? `/nieuws?pagina=${n}` : "/nieuws";
}

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const { pagina } = await searchParams;
  const page = Math.max(1, Number.parseInt(pagina ?? "1", 10) || 1);
  const [{ posts, total, pageCount }, content] = await Promise.all([getPublishedNews({ page, pageSize: NEWS_PAGE_SIZE }), getContent()]);
  if (total > 0 && page > pageCount) notFound();

  const [featured, ...rest] = page === 1 ? posts : [];
  const grid = page === 1 ? rest : posts;

  return (
    <>
      <PageHeader
        eyebrow="Nieuws"
        title={content.pageNewsTitle}
        description={content.pageNewsText}
        image={content.pageNewsImage || undefined}
        breadcrumbs={[{ label: "Nieuws" }]}
      />

      <section className="container-site py-16 sm:py-20">
        {total === 0 ? (
          <EmptyState
            icon={<Newspaper />}
            title="Nog geen nieuws"
            description="Hier verschijnen binnenkort de laatste berichten van de club. Bekijk alvast de agenda voor de komende ritten en meetings."
            action={
              <Button asChild>
                <Link href="/evenementen">
                  <CalendarDays /> Bekijk de agenda
                </Link>
              </Button>
            }
          />
        ) : (
          <>
            {featured && <NewsCard post={featured} featured />}

            {grid.length > 0 && (
              <div className={cn("grid gap-6 sm:grid-cols-2 lg:grid-cols-3", featured && "mt-10")}>
                {grid.map((post) => (
                  <NewsCard key={post.id} post={post} />
                ))}
              </div>
            )}

            {pageCount > 1 && (
              <nav className="mt-14 flex items-center justify-center gap-2" aria-label="Paginering">
                <Button asChild={page > 1} variant="outline" size="icon" disabled={page <= 1} aria-label="Vorige pagina">
                  {page > 1 ? (
                    <Link href={pageHref(page - 1)}>
                      <ChevronLeft />
                    </Link>
                  ) : (
                    <ChevronLeft />
                  )}
                </Button>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <Link
                    key={n}
                    href={pageHref(n)}
                    aria-current={n === page ? "page" : undefined}
                    className={cn(
                      "flex size-10 items-center justify-center rounded-md border text-sm font-semibold transition-colors",
                      n === page ? "border-primary bg-primary text-white" : "border-border hover:bg-muted",
                    )}
                  >
                    {n}
                  </Link>
                ))}
                <Button asChild={page < pageCount} variant="outline" size="icon" disabled={page >= pageCount} aria-label="Volgende pagina">
                  {page < pageCount ? (
                    <Link href={pageHref(page + 1)}>
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
