import type { NewsPost, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

/** Nieuwsberichten: een bericht is zichtbaar als het gepubliceerd is én de publicatiedatum is bereikt. */

export const NEWS_PAGE_SIZE = 9;
export const NEWS_EXCERPT_MAX = 300;

export function publishedNewsWhere(now = new Date()): Prisma.NewsPostWhereInput {
  return { published: true, publishedAt: { lte: now } };
}

export const newsCardSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverUrl: true,
  publishedAt: true,
  authorName: true,
} satisfies Prisma.NewsPostSelect;

export type NewsCardData = Prisma.NewsPostGetPayload<{ select: typeof newsCardSelect }>;

export type NewsStatus = "published" | "scheduled" | "draft";

export function newsStatus(post: Pick<NewsPost, "published" | "publishedAt">, now = new Date()): NewsStatus {
  if (!post.published) return "draft";
  if (post.publishedAt && post.publishedAt > now) return "scheduled";
  return "published";
}

export const newsStatusLabels: Record<NewsStatus, string> = {
  published: "Gepubliceerd",
  scheduled: "Ingepland",
  draft: "Concept",
};

/** Gepubliceerde berichten, nieuwste eerst, met paginering. */
export async function getPublishedNews({ page = 1, pageSize = NEWS_PAGE_SIZE }: { page?: number; pageSize?: number } = {}) {
  const where = publishedNewsWhere();
  const [total, posts] = await Promise.all([
    prisma.newsPost.count({ where }),
    prisma.newsPost.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: newsCardSelect,
    }),
  ]);
  return { posts, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Eén bericht op slug. Standaard alleen gepubliceerd; beheerders mogen concepten als voorbeeld bekijken. */
export async function getNewsBySlug(slug: string, { includeUnpublished = false }: { includeUnpublished?: boolean } = {}) {
  return prisma.newsPost.findFirst({ where: { slug, ...(includeUnpublished ? {} : publishedNewsWhere()) } });
}

/** Laatste berichten voor de homepagina of "Meer nieuws". Geeft bij een databasefout een lege lijst. */
export async function getLatestNews(limit = 3, { excludeSlug }: { excludeSlug?: string } = {}): Promise<NewsCardData[]> {
  try {
    return await prisma.newsPost.findMany({
      where: { ...publishedNewsWhere(), ...(excludeSlug ? { NOT: { slug: excludeSlug } } : {}) },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: newsCardSelect,
    });
  } catch (err) {
    console.error("[nieuws] laatste berichten ophalen mislukt", err);
    return [];
  }
}

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const newsAdminSchema = z.object({
  title: z.string().trim().min(3, "Vul een titel in (minimaal 3 tekens)").max(160, "Maximaal 160 tekens"),
  slug: optionalText(160),
  excerpt: z
    .string()
    .trim()
    .min(10, "Schrijf een korte samenvatting (minimaal 10 tekens)")
    .max(NEWS_EXCERPT_MAX, `Maximaal ${NEWS_EXCERPT_MAX} tekens`),
  content: z.string().max(100_000, "De tekst is te lang"),
  coverUrl: optionalText(1000),
  published: z.boolean(),
  publishedAt: z.date().nullable(),
  authorName: optionalText(120),
});

export type NewsAdminInput = z.infer<typeof newsAdminSchema>;
