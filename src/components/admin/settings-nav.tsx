"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CreditCard, Gauge, IdCard, Mail, Truck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const settingsTabs: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/admin/instellingen", label: "Overzicht", icon: Gauge },
  { href: "/admin/instellingen/betalingen", label: "Betalingen", icon: CreditCard },
  { href: "/admin/instellingen/lidmaatschap", label: "Lidmaatschap & prijzen", icon: IdCard },
  { href: "/admin/instellingen/verzending", label: "Verzending", icon: Truck },
  { href: "/admin/instellingen/e-mail", label: "E-mail", icon: Mail },
  { href: "/admin/instellingen/meldingen", label: "Meldingen", icon: Bell },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Instellingen" className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-white p-1.5 [scrollbar-width:none]">
      {settingsTabs.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin/instellingen" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors",
              active ? "bg-primary text-white" : "text-foreground/70 hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
