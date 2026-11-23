import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { NewsCardData } from "@/lib/news";
import { cn } from "@/lib/utils";
import { NewsCard } from "./news-card";

/**
 * Homepagina-sectie met de laatste nieuwsberichten. Toont niets zolang er geen gepubliceerd nieuws is.
 * Gebruik: `const posts = await getLatestNews(3)` en `<LatestNews posts={posts} />`.
 */
export function LatestNews({
  posts,
  title = "Laatste nieuws",
  eyebrow = "Nieuws",
  className,
}: {
  posts: NewsCardData[];
  title?: string;
  eyebrow?: string;
  className?: string;
}) {
  if (posts.length === 0) return null;

  return (
    <section className={cn("py-20 sm:py-28", className)}>
      <div className="container-site">
        <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="heading-lg mt-4">{title}</h2>
          </div>
          <Link href="/nieuws" className="group inline-flex items-center gap-2 text-sm font-semibold text-primary">
            Al het nieuws <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <NewsCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}
