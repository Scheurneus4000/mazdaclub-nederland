import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ExternalLink, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteNews, toggleNewsPublished } from "@/app/admin/actions/news";
import { ActionButton } from "@/components/admin/action-button";
import { AdminPageHeader, TableEmpty } from "@/components/admin/page-title";
import { ADMIN_PAGE_SIZE, Pagination, parsePage } from "@/components/admin/pagination";
import { readParam, SearchForm } from "@/components/admin/search-form";
import { NewsStatusBadge } from "@/components/news/news-card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/form-controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/db";
import { newsStatus } from "@/lib/news";
import { requireAdmin } from "@/lib/session";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Nieuws" };
export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminNewsPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = readParam(sp.q);
  const status = readParam(sp.status) || "alle";
  const page = parsePage(sp.pagina);
  const now = new Date();

  const where: Prisma.NewsPostWhereInput = {};
  if (q) where.OR = [{ title: { contains: q, mode: "insensitive" } }, { excerpt: { contains: q, mode: "insensitive" } }];
  if (status === "gepubliceerd") Object.assign(where, { published: true, publishedAt: { lte: now } });
  if (status === "ingepland") Object.assign(where, { published: true, publishedAt: { gt: now } });
  if (status === "concept") where.published = false;

  const [total, posts] = await Promise.all([
    prisma.newsPost.count({ where }),
    prisma.newsPost.findMany({
      where,
      orderBy: [{ publishedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: { id: true, slug: true, title: true, excerpt: true, published: true, publishedAt: true, updatedAt: true, authorName: true },
    }),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Nieuws"
        description="Schrijf nieuwsberichten en publiceer ze direct of op een later moment. Berichten verschijnen op /nieuws en de nieuwste drie op de homepagina."
        actions={
          <Button asChild>
            <Link href="/admin/nieuws/nieuw">
              <Plus /> Nieuw bericht
            </Link>
          </Button>
        }
      />

      {sp.verwijderd && (
        <Alert variant="success" className="mb-6">
          Het nieuwsbericht is verwijderd.
        </Alert>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-xs">
        <SearchForm
          action="/admin/nieuws"
          q={q}
          placeholder="Zoek op titel of samenvatting"
          filters={[
            {
              name: "status",
              label: "Status",
              value: status,
              options: [
                { value: "alle", label: "Alle berichten" },
                { value: "gepubliceerd", label: "Gepubliceerd" },
                { value: "ingepland", label: "Ingepland" },
                { value: "concept", label: "Concept" },
              ],
            },
          ]}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bericht</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Publicatiedatum</TableHead>
              <TableHead>Laatst gewijzigd</TableHead>
              <TableHead className="text-right">Acties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.length === 0 && (
              <TableEmpty colSpan={5}>
                {q || status !== "alle" ? (
                  "Geen berichten gevonden."
                ) : (
                  <>
                    Nog geen nieuwsberichten.{" "}
                    <Link href="/admin/nieuws/nieuw" className="font-semibold text-primary hover:underline">
                      Schrijf het eerste bericht
                    </Link>
                    .
                  </>
                )}
              </TableEmpty>
            )}
            {posts.map((post) => {
              const st = newsStatus(post, now);
              return (
                <TableRow key={post.id}>
                  <TableCell className="min-w-72 max-w-xl">
                    <Link href={`/admin/nieuws/${post.id}`} className="font-semibold hover:text-primary">
                      {post.title}
                    </Link>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{post.excerpt}</p>
                  </TableCell>
                  <TableCell>
                    <NewsStatusBadge status={st} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {post.publishedAt ? (st === "scheduled" ? formatDateTime(post.publishedAt) : formatDate(post.publishedAt)) : "–"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(post.updatedAt)}
                    {post.authorName && <span className="block text-xs">door {post.authorName}</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <Button asChild variant="ghost" size="sm" title={st === "published" ? "Bekijken op de website" : "Voorbeeld bekijken"}>
                        <Link href={`/nieuws/${post.slug}`} target="_blank">
                          <ExternalLink /> <span className="sr-only sm:not-sr-only">{st === "published" ? "Bekijken" : "Voorbeeld"}</span>
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/nieuws/${post.id}`}>
                          <Pencil /> <span className="sr-only sm:not-sr-only">Bewerken</span>
                        </Link>
                      </Button>
                      <ActionButton
                        action={toggleNewsPublished}
                        fields={{ id: post.id }}
                        variant="outline"
                        title={post.published ? "Offline halen (wordt weer concept)" : "Publiceren"}
                        confirm={post.published ? `"${post.title}" offline halen? Het bericht blijft bewaard als concept.` : undefined}
                      >
                        {post.published ? <EyeOff /> : <Eye />}
                        <span className="sr-only sm:not-sr-only">{post.published ? "Offline" : "Publiceren"}</span>
                      </ActionButton>
                      <ActionButton
                        action={deleteNews}
                        fields={{ id: post.id }}
                        variant="ghost"
                        className="text-destructive hover:bg-red-50 hover:text-destructive"
                        title="Verwijderen"
                        confirm={`"${post.title}" definitief verwijderen? Dit kan niet ongedaan worden gemaakt.`}
                      >
                        <Trash2 /> <span className="sr-only">Verwijderen</span>
                      </ActionButton>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Pagination page={page} total={total} basePath="/admin/nieuws" params={{ q, status }} />
      </div>
    </>
  );
}
