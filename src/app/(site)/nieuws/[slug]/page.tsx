import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, UserRound } from "lucide-react";
import { auth } from "@/auth";
import { PageHeader } from "@/components/layout/page-header";
import { NewsCard } from "@/components/news/news-card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/form-controls";
import { RichText } from "@/components/ui/rich-text";
import { getLatestNews, getNewsBySlug, newsStatus } from "@/lib/news";
import { formatDate, formatDateTime, siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getNewsBySlug(slug);
  if (!post) return { title: "Nieuwsbericht niet gevonden", robots: { index: false } };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/nieuws/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: post.authorName ? [post.authorName] : undefined,
      images: post.coverUrl ? [{ url: post.coverUrl, alt: post.title }] : undefined,
    },
    twitter: { card: post.coverUrl ? "summary_large_image" : "summary", title: post.title, description: post.excerpt },
  };
}

export default async function NewsArticlePage({ params }: Params) {
  const [{ slug }, session] = await Promise.all([params, auth()]);
  const isAdmin = session?.user?.role === "ADMIN";

  const post = await getNewsBySlug(slug, { includeUnpublished: isAdmin });
  if (!post) notFound();

  const status = newsStatus(post);
  const others = await getLatestNews(3, { excludeSlug: post.slug });
  const url = siteUrl(`/nieuws/${post.slug}`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    description: post.excerpt,
    ...(post.coverUrl ? { image: [post.coverUrl.startsWith("/") ? siteUrl(post.coverUrl) : post.coverUrl] } : {}),
    datePublished: (post.publishedAt ?? post.createdAt).toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: post.authorName ? { "@type": "Person", name: post.authorName } : { "@type": "Organization", name: "MazdaClub Nederland" },
    publisher: { "@type": "Organization", name: "MazdaClub Nederland", url: siteUrl(), logo: { "@type": "ImageObject", url: siteUrl("/icon.svg") } },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  return (
    <>
      <PageHeader eyebrow="Nieuws" title={post.title} description={post.excerpt} breadcrumbs={[{ label: "Nieuws", href: "/nieuws" }, { label: post.title }]}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/70">
          {post.publishedAt && (
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              <time dateTime={post.publishedAt.toISOString()}>{formatDate(post.publishedAt, { weekday: "long" })}</time>
            </span>
          )}
          {post.authorName && (
            <span className="inline-flex items-center gap-2">
              <UserRound className="size-4 text-primary" /> {post.authorName}
            </span>
          )}
        </div>
      </PageHeader>

      <article className="container-site py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          {status !== "published" && (
            <Alert variant="warning" className="mb-8">
              <strong>Voorbeeld voor beheerders.</strong>{" "}
              {status === "scheduled" && post.publishedAt
                ? `Dit bericht is ingepland en wordt zichtbaar op ${formatDateTime(post.publishedAt)}.`
                : "Dit bericht is een concept en is nog niet zichtbaar voor bezoekers."}{" "}
              <Link href={`/admin/nieuws/${post.id}`} className="font-semibold underline underline-offset-4">
                Bewerken
              </Link>
            </Alert>
          )}

          {post.coverUrl && (
            <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
              <Image src={post.coverUrl} alt="" fill priority sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
            </div>
          )}

          <RichText value={post.content} className="text-base sm:text-[17px]" />

          <div className="mt-14 flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
            <Button asChild variant="outline">
              <Link href="/nieuws">
                <ArrowLeft /> Terug naar het nieuws
              </Link>
            </Button>
            <Button asChild>
              <Link href="/evenementen">Bekijk de agenda</Link>
            </Button>
          </div>
        </div>
      </article>

      {others.length > 0 && (
        <section className="bg-surface py-16 sm:py-20">
          <div className="container-site">
            <div className="mb-8 flex items-end justify-between gap-4">
              <h2 className="heading-md">Meer nieuws</h2>
              <Link href="/nieuws" className="text-sm font-semibold text-primary hover:underline">
                Al het nieuws
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((p) => (
                <NewsCard key={p.id} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {status === "published" && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
    </>
  );
}
