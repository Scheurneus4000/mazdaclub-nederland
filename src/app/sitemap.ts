import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { publishedNewsWhere } from "@/lib/news";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: siteUrl("/evenementen"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: siteUrl("/nieuws"), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: siteUrl("/webshop"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: siteUrl("/fotogalerij"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: siteUrl("/lid-worden"), lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: siteUrl("/contact"), lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: siteUrl("/privacy"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: siteUrl("/algemene-voorwaarden"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: siteUrl("/verzending"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const [events, news, products, albums] = await Promise.all([
      prisma.event.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
      prisma.newsPost.findMany({ where: publishedNewsWhere(now), select: { slug: true, updatedAt: true } }),
      prisma.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
      prisma.album.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    ]);
    return [
      ...staticPages,
      ...events.map((e) => ({ url: siteUrl(`/evenementen/${e.slug}`), lastModified: e.updatedAt, priority: 0.8 })),
      ...news.map((n) => ({ url: siteUrl(`/nieuws/${n.slug}`), lastModified: n.updatedAt, priority: 0.6 })),
      ...products.map((p) => ({ url: siteUrl(`/webshop/${p.slug}`), lastModified: p.updatedAt, priority: 0.7 })),
      ...albums.map((a) => ({ url: siteUrl(`/fotogalerij/${a.slug}`), lastModified: a.updatedAt, priority: 0.5 })),
    ];
  } catch {
    return staticPages;
  }
}
