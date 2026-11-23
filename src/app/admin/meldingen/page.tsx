import type { Metadata } from "next";
import Link from "next/link";
import { BellOff, Check, CheckCheck, ChevronRight, Settings } from "lucide-react";
import { markAllNotificationsRead, markNotificationRead, openNotification } from "@/app/admin/actions/notification-settings";
import { NotificationIcon } from "@/components/admin/notification-icon";
import { AdminPageHeader } from "@/components/admin/page-title";
import { ADMIN_PAGE_SIZE, Pagination, parsePage } from "@/components/admin/pagination";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { notificationEventLabels, type NotificationEvent } from "@/lib/notifications";
import { requireAdmin } from "@/lib/session";
import { cn, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Meldingen" };
export const dynamic = "force-dynamic";

function relativeTime(date: Date, now: Date): string {
  const minutes = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "zojuist";
  if (minutes < 60) return `${minutes} min geleden`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} uur geleden`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? "dag" : "dagen"} geleden`;
  return formatDateTime(date);
}

export default async function AdminNotificationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const onlyUnread = sp.filter === "ongelezen";
  const page = parsePage(sp.pagina);
  const where = onlyUnread ? { readAt: null } : {};
  const now = new Date();

  const [total, unread, items] = await Promise.all([
    prisma.adminNotification.count({ where }),
    prisma.adminNotification.count({ where: { readAt: null } }),
    prisma.adminNotification.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * ADMIN_PAGE_SIZE, take: ADMIN_PAGE_SIZE }),
  ]);

  const tab = (active: boolean) =>
    cn("rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors", active ? "bg-primary text-white" : "text-foreground/70 hover:bg-muted hover:text-foreground");

  return (
    <>
      <AdminPageHeader
        title="Meldingen"
        description="Belangrijke activiteiten op de website: nieuwe accounts en leden, aanmeldingen voor ritten, bestellingen en berichten."
        actions={
          <>
            {unread > 0 && (
              <form action={markAllNotificationsRead}>
                <Button type="submit" variant="outline" size="sm">
                  <CheckCheck /> Alles gelezen
                </Button>
              </form>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/instellingen/meldingen">
                <Settings /> Meldingen instellen
              </Link>
            </Button>
          </>
        }
      />

      <nav aria-label="Filter" className="mb-4 inline-flex gap-1 rounded-xl border border-border bg-white p-1.5">
        <Link href="/admin/meldingen" className={tab(!onlyUnread)} aria-current={!onlyUnread ? "page" : undefined}>
          Alle
        </Link>
        <Link href="/admin/meldingen?filter=ongelezen" className={tab(onlyUnread)} aria-current={onlyUnread ? "page" : undefined}>
          Ongelezen{unread > 0 ? ` (${unread})` : ""}
        </Link>
      </nav>

      <section className="overflow-hidden rounded-xl border border-border bg-white">
        {items.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <BellOff className="size-8 text-muted-foreground" />
            <p className="mt-3 font-semibold">{onlyUnread ? "Geen ongelezen meldingen" : "Nog geen meldingen"}</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Zodra iemand een account aanmaakt, lid wordt, zich aanmeldt voor een rit of iets bestelt, verschijnt dat hier.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((n) => {
              const label = notificationEventLabels[n.type as NotificationEvent]?.label ?? (n.type === "test" ? "Test" : "Melding");
              return (
                <li key={n.id} className={cn("flex gap-4 px-5 py-4", !n.readAt && "bg-accent/30")}>
                  <NotificationIcon type={n.type} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      {!n.readAt && <span className="size-2 rounded-full bg-primary" aria-label="Ongelezen" />}
                      <p className="font-semibold">{n.title}</p>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {label} · <time dateTime={n.createdAt.toISOString()} title={formatDateTime(n.createdAt)}>{relativeTime(n.createdAt, now)}</time>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                    {n.link && (
                      <form action={openNotification}>
                        <input type="hidden" name="id" value={n.id} />
                        <Button type="submit" size="sm" variant="outline">
                          Bekijken <ChevronRight />
                        </Button>
                      </form>
                    )}
                    {!n.readAt && (
                      <form action={markNotificationRead}>
                        <input type="hidden" name="id" value={n.id} />
                        <Button type="submit" size="sm" variant="ghost" title="Markeer als gelezen">
                          <Check /> <span className="sr-only sm:not-sr-only">Gelezen</span>
                        </Button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Pagination page={page} total={total} basePath="/admin/meldingen" params={{ filter: onlyUnread ? "ongelezen" : undefined }} />
      </section>
    </>
  );
}
