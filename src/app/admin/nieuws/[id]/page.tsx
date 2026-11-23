import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { deleteNews } from "@/app/admin/actions/news";
import { ActionButton } from "@/components/admin/action-button";
import { NewsForm } from "@/components/admin/news-form";
import { AdminPageHeader } from "@/components/admin/page-title";
import { NewsStatusBadge } from "@/components/news/news-card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/form-controls";
import { prisma } from "@/lib/db";
import { newsStatus } from "@/lib/news";
import { requireAdmin } from "@/lib/session";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Nieuwsbericht" };
export const dynamic = "force-dynamic";

export default async function AdminNewsDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);

  const post = await prisma.newsPost.findUnique({ where: { id } });
  if (!post) notFound();
  const status = newsStatus(post);

  const description =
    status === "published" && post.publishedAt
      ? `Gepubliceerd op ${formatDateTime(post.publishedAt)}`
      : status === "scheduled" && post.publishedAt
        ? `Ingepland voor ${formatDateTime(post.publishedAt)}`
        : "Concept – nog niet zichtbaar op de website";

  return (
    <>
      <AdminPageHeader
        title={post.title}
        badge={<NewsStatusBadge status={status} />}
        description={description}
        back={{ href: "/admin/nieuws", label: "Nieuws" }}
        actions={
          <>
            <Button asChild variant={status === "published" ? "dark" : "outline"} size="sm">
              <Link href={`/nieuws/${post.slug}`} target="_blank">
                <ExternalLink /> {status === "published" ? "Bekijk op site" : "Voorbeeld bekijken"}
              </Link>
            </Button>
            <ActionButton
              action={deleteNews}
              fields={{ id: post.id }}
              variant="outline"
              className="text-destructive hover:bg-red-50 hover:text-destructive"
              confirm={`"${post.title}" definitief verwijderen? Dit kan niet ongedaan worden gemaakt.`}
            >
              <Trash2 /> Verwijderen
            </ActionButton>
          </>
        }
      />

      {sp.aangemaakt && (
        <Alert variant="success" className="mb-6">
          {status === "draft" ? (
            <>
              Het bericht is opgeslagen als <strong>concept</strong>. Vink &quot;Publiceren op de website&quot; aan en sla op om het te publiceren.
            </>
          ) : status === "scheduled" ? (
            "Het bericht is ingepland en verschijnt automatisch op de gekozen datum."
          ) : (
            "Het bericht is gepubliceerd en staat op de website."
          )}
        </Alert>
      )}

      <NewsForm post={post} defaultAuthor={`${admin.firstName} ${admin.lastName}`.trim()} />
    </>
  );
}
