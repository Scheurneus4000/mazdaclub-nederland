"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  CircleHelp,
  CreditCard,
  Images,
  LayoutDashboard,
  Mail,
  Newspaper,
  Package,
  Palette,
  Settings,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";
import { adminSidebarNav } from "@/lib/site";
import { cn } from "@/lib/utils";

const icons: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/evenementen": CalendarDays,
  "/admin/bestellingen": ShoppingBag,
  "/admin/leden": Users,
  "/admin/nieuws": Newspaper,
  "/admin/producten": Package,
  "/admin/fotoalbums": Images,
  "/admin/content": Palette,
  "/admin/betalingen": CreditCard,
  "/admin/meldingen": Bell,
  "/admin/berichten": Mail,
  "/admin/instellingen": Settings,
  "/admin/hulp": CircleHelp,
};

/** Kopjes in de zijbalk vóór deze links. */
const sectionTitles: Record<string, string> = {
  "/admin/nieuws": "Website",
  "/admin/betalingen": "Administratie",
};

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Zijbalknavigatie van het beheerpaneel (desktop) en horizontale balk (mobiel). */
export function AdminSidebarNav({ badges = {}, variant = "sidebar" }: { badges?: Record<string, number>; variant?: "sidebar" | "mobile" }) {
  const pathname = usePathname();

  if (variant === "mobile") {
    return (
      <nav aria-label="Beheernavigatie" className="flex gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none]">
        {adminSidebarNav.map((item) => {
          const Icon = icons[item.href] ?? LayoutDashboard;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-accent text-primary" : "text-foreground/70 hover:bg-muted",
              )}
            >
              <Icon className="size-4" />
              {item.label}
              {!!badges[item.href] && <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">{badges[item.href]}</span>}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Beheernavigatie" className="flex flex-col gap-0.5 p-3">
      {adminSidebarNav.map((item) => {
        const Icon = icons[item.href] ?? LayoutDashboard;
        const active = isActive(pathname, item.href);
        return (
          <div key={item.href}>
            {sectionTitles[item.href] && (
              <p className="mt-4 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{sectionTitles[item.href]}</p>
            )}
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-accent text-primary" : "text-foreground/75 hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className={cn("size-[18px]", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              <span className="flex-1">{item.label}</span>
              {!!badges[item.href] && (
                <span className="min-w-5 rounded-full bg-primary px-1.5 py-0.5 text-center text-[10px] font-bold text-white tabular-nums">{badges[item.href]}</span>
              )}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
