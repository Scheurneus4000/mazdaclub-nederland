import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { NewsCardData, NewsStatus } from "@/lib/news";
import { newsStatusLabels } from "@/lib/news";
import { cn, formatDate } from "@/lib/utils";

function Cover({ post, sizes, className }: { post: NewsCardData; sizes: string; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-ink", className)}>
      {post.coverUrl ? (
        <Image src={post.coverUrl} alt="" fill sizes={sizes} className="object-cover transition-transform duration-700 group-hover:scale-105" />
      ) : (
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-ink via-ink to-primary/70">
          <Newspaper className="size-10 text-white/35" />
        </div>
      )}
    </div>
  );
}

/** Nieuwskaart voor overzichten. `featured` = groot, liggend formaat voor het nieuwste bericht. */
export function NewsCard({ post, featured = false, className }: { post: NewsCardData; featured?: boolean; className?: string }) {
  const href = `/nieuws/${post.slug}`;

  if (featured) {
    return (
      <article className={cn("group relative grid overflow-hidden rounded-2xl border border-border bg-white transition-shadow hover:shadow-xl lg:grid-cols-2", className)}>
        <Cover post={post} sizes="(min-width: 1024px) 50vw, 100vw" className="aspect-[16/10] lg:aspect-auto lg:min-h-[360px]" />
        <div className="flex flex-col justify-center p-7 sm:p-10">
          {post.publishedAt && (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <time dateTime={post.publishedAt.toISOString()}>{formatDate(post.publishedAt)}</time>
            </p>
          )}
          <h2 className="mt-3 font-display text-2xl font-bold uppercase leading-tight tracking-tight sm:text-3xl">
            <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none">
              {post.title}
            </Link>
          </h2>
          <p className="mt-4 line-clamp-4 leading-relaxed text-muted-foreground">{post.excerpt}</p>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
            Lees verder <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </article>
    );
  }

  return (
    <article className={cn("group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg", className)}>
      <Cover post={post} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="aspect-[16/10]" />
      <div className="flex flex-1 flex-col p-6">
        {post.publishedAt && (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <time dateTime={post.publishedAt.toISOString()}>{formatDate(post.publishedAt)}</time>
          </p>
        )}
        <h3 className="mt-2 font-display text-lg font-bold uppercase leading-snug tracking-tight">
          <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none group-hover:text-primary">
            {post.title}
          </Link>
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-primary">
          Lees verder <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </article>
  );
}

/** Statuslabel voor het beheerpaneel. */
export function NewsStatusBadge({ status }: { status: NewsStatus }) {
  const variant = status === "published" ? "success" : status === "scheduled" ? "info" : "secondary";
  return <Badge variant={variant}>{newsStatusLabels[status]}</Badge>;
}
