import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { CheckCheck, Inbox, Reply, RotateCcw, Trash2 } from "lucide-react";
import { deleteMessage, toggleMessageHandled } from "@/app/admin/actions/messages";
import { ActionButton } from "@/components/admin/action-button";
import { AdminPageHeader } from "@/components/admin/page-title";
import { ADMIN_PAGE_SIZE, Pagination, parsePage } from "@/components/admin/pagination";
import { readParam } from "@/components/admin/search-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { cn, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Berichten" };
export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "open", label: "Open" },
  { value: "afgehandeld", label: "Afgehandeld" },
  { value: "alle", label: "Alle" },
];

export default async function AdminMessagesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const filter = FILTERS.some((f) => f.value === readParam(sp.filter)) ? readParam(sp.filter) : "open";
  const page = parsePage(sp.pagina);

  const where: Prisma.ContactMessageWhereInput = filter === "open" ? { handled: false } : filter === "afgehandeld" ? { handled: true } : {};
  const [total, messages, openCount] = await Promise.all([
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * ADMIN_PAGE_SIZE, take: ADMIN_PAGE_SIZE }),
    prisma.contactMessage.count({ where: { handled: false } }),
  ]);

  return (
    <>
      <AdminPageHeader title="Berichten" description={`${openCount} open bericht${openCount === 1 ? "" : "en"} via het contactformulier.`} />

      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "open" ? "/admin/berichten" : `/admin/berichten?filter=${f.value}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              filter === f.value ? "border-ink bg-ink text-white" : "border-border bg-white hover:bg-muted",
            )}
          >
            {f.label}
            {f.value === "open" && ` (${openCount})`}
          </Link>
        ))}
      </div>

      {messages.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-white px-6 py-16 text-center">
          <Inbox className="size-8 text-primary" />
          <p className="mt-3 font-semibold">{filter === "open" ? "Alles is afgehandeld" : "Geen berichten"}</p>
          <p className="mt-1 text-sm text-muted-foreground">Nieuwe berichten van het contactformulier verschijnen hier.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {messages.map((m) => (
            <li key={m.id} className={cn("rounded-xl border bg-white p-5 shadow-xs", m.handled ? "border-border opacity-80" : "border-l-4 border-l-primary")}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{m.subject}</h2>
                    {m.handled ? <Badge variant="secondary">Afgehandeld</Badge> : <Badge variant="warning">Open</Badge>}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {m.name} · <a href={`mailto:${m.email}`} className="hover:text-primary">{m.email}</a> · {formatDateTime(m.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  <Button asChild variant="outline" size="sm">
                    <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}>
                      <Reply /> Beantwoorden
                    </a>
                  </Button>
                  <ActionButton action={toggleMessageHandled} fields={{ id: m.id }} variant={m.handled ? "outline" : "dark"}>
                    {m.handled ? <RotateCcw /> : <CheckCheck />}
                    {m.handled ? "Heropenen" : "Afgehandeld"}
                  </ActionButton>
                  <ActionButton
                    action={deleteMessage}
                    fields={{ id: m.id }}
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    title="Verwijderen"
                    confirm="Bericht definitief verwijderen?"
                  >
                    <Trash2 />
                  </ActionButton>
                </div>
              </div>
              <p className="mt-4 whitespace-pre-wrap rounded-lg bg-surface p-4 text-sm leading-relaxed">{m.message}</p>
            </li>
          ))}
        </ul>
      )}
      {total > ADMIN_PAGE_SIZE && (
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-white">
          <Pagination page={page} total={total} basePath="/admin/berichten" params={{ filter: filter !== "open" ? filter : undefined }} />
        </div>
      )}
    </>
  );
}
