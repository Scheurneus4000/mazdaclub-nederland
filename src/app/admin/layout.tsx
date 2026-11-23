import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Bell, ExternalLink, ShieldCheck } from "lucide-react";
import { AdminSidebarNav } from "@/components/admin/sidebar-nav";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: { default: "Beheer", template: "%s | Beheer MazdaClub" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  const [openMessages, toShip, unreadNotifications] = await Promise.all([
    prisma.contactMessage.count({ where: { handled: false } }),
    prisma.order.count({ where: { status: { in: ["PAID", "PROCESSING"] } } }),
    prisma.adminNotification.count({ where: { readAt: null } }),
  ]);
  const badges = { "/admin/berichten": openMessages, "/admin/bestellingen": toShip, "/admin/meldingen": unreadNotifications };

  return (
    <div className="min-h-[calc(100dvh-72px)] bg-surface">
      <div className="flex">
        <aside className="sticky top-[72px] hidden h-[calc(100dvh-72px)] w-64 shrink-0 flex-col border-r border-border bg-white lg:flex print:!hidden">
          <div className="flex items-center gap-2 border-b border-border px-6 py-4">
            <ShieldCheck className="size-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Beheerpaneel</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <AdminSidebarNav badges={badges} />
          </div>
          <div className="border-t border-border p-4">
            <p className="truncate text-sm font-semibold">
              {admin.firstName} {admin.lastName}
            </p>
            <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
            <Link href="/" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
              <ExternalLink className="size-3.5" /> Bekijk website
            </Link>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Beheerdermodus-balk: altijd zichtbaar bovenaan het beheer */}
          <div className="sticky top-[72px] z-30 border-b border-white/10 bg-ink text-white print:hidden">
            <div className="mx-auto flex h-11 w-full max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
              <p className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                <ShieldCheck className="size-4 shrink-0 text-primary" />
                <span className="truncate">Beheerdermodus</span>
              </p>
              <div className="flex shrink-0 items-center gap-1.5">
                <Link
                  href="/admin/meldingen"
                  className="relative flex size-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label={unreadNotifications > 0 ? `Meldingen, ${unreadNotifications} ongelezen` : "Meldingen"}
                  title="Meldingen"
                >
                  <Bell className="size-[18px]" />
                  {unreadNotifications > 0 && (
                    <span
                      className={cn(
                        "absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold tabular-nums ring-2 ring-ink",
                      )}
                    >
                      {unreadNotifications > 99 ? "99+" : unreadNotifications}
                    </span>
                  )}
                </Link>
                <Button asChild size="sm" variant="outline-light" className="h-8">
                  <Link href="/">
                    <ArrowLeft /> <span className="hidden sm:inline">Terug naar de website</span>
                    <span className="sm:hidden">Website</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
          <div className="sticky top-[116px] z-20 border-b border-border bg-white lg:hidden print:hidden">
            <AdminSidebarNav badges={badges} variant="mobile" />
          </div>
          <main id="main" className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10 print:p-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
