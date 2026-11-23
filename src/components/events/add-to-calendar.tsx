"use client";

import { Apple, CalendarDays, CalendarPlus, ChevronDown, Download, Mail, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { CalendarLinks } from "@/lib/calendar";
import { cn } from "@/lib/utils";

type Option = { key: string; label: string; hint: string; href: string; icon: LucideIcon; external: boolean };

function options(links: CalendarLinks): Option[] {
  return [
    { key: "google", label: "Google Agenda", hint: "Gmail en Android", href: links.google, icon: CalendarDays, external: true },
    { key: "apple", label: "Apple Agenda", hint: "iPhone, iPad en Mac", href: links.ics, icon: Apple, external: false },
    { key: "outlook", label: "Outlook", hint: "Outlook.com en Hotmail", href: links.outlook, icon: Mail, external: true },
    { key: "ics", label: "Andere agenda (.ics)", hint: "Outlook-app, Thunderbird e.d.", href: links.ics, icon: Download, external: false },
  ];
}

function linkProps(o: Pick<Option, "href" | "external">) {
  return o.external ? { href: o.href, target: "_blank", rel: "noopener noreferrer" } : { href: o.href };
}

/**
 * "Zet in je agenda".
 *  - variant "panel": opvallend blok met vier knoppen (na een aanmelding)
 *  - variant "compact": knop met keuzemenu (bij evenementinformatie en in Mijn Account)
 */
export function AddToCalendar({
  links,
  variant = "panel",
  title = "Zet het in je agenda",
  description = "Kies je agenda-app, dan vergeet je de rit niet.",
  className,
  align = "start",
}: {
  links: CalendarLinks;
  variant?: "panel" | "compact";
  title?: string;
  description?: string;
  className?: string;
  align?: "start" | "end";
}) {
  const items = options(links);

  if (variant === "compact") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className={cn("h-9", className)}>
            <CalendarPlus /> Zet in agenda <ChevronDown className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-64">
          <DropdownMenuLabel>Toevoegen aan</DropdownMenuLabel>
          {items.slice(0, 3).map((o) => (
            <DropdownMenuItem key={o.key} asChild>
              <a {...linkProps(o)}>
                <o.icon />
                <span className="flex flex-col">
                  <span className="font-medium">{o.label}</span>
                  <span className="text-xs text-muted-foreground">{o.hint}</span>
                </span>
              </a>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href={links.office365} target="_blank" rel="noopener noreferrer">
              <Mail />
              <span className="flex flex-col">
                <span className="font-medium">Outlook (werk of school)</span>
                <span className="text-xs text-muted-foreground">Microsoft 365</span>
              </span>
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={links.ics}>
              <Download />
              <span className="font-medium">Agendabestand downloaden (.ics)</span>
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <section className={cn("rounded-2xl border border-primary/20 bg-accent/50 p-5 text-left sm:p-6", className)} aria-label={title}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
          <CalendarPlus className="size-5" />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold uppercase tracking-tight">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {items.map((o) => (
          <li key={o.key}>
            <a
              {...linkProps(o)}
              className="group flex h-full items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 transition-colors hover:border-primary/50 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <o.icon className="size-5 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold group-hover:text-primary">{o.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{o.hint}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        Outlook van je werk of school?{" "}
        <a href={links.office365} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2">
          Gebruik Microsoft 365
        </a>
        .
      </p>
    </section>
  );
}
