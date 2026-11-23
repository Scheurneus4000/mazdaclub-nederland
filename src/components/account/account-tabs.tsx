"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BadgeCheck, CalendarDays, Gift, LayoutGrid, Package, ShieldCheck, UserRound, type LucideIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { accountTabList, isAccountTab, type AccountTab } from "./tabs-config";

const icons: Record<AccountTab, LucideIcon> = {
  overzicht: LayoutGrid,
  profiel: UserRound,
  lidmaatschap: BadgeCheck,
  bestellingen: Package,
  inschrijvingen: CalendarDays,
  voordelen: Gift,
  privacy: ShieldCheck,
};

/** Tabs van Mijn Account; de actieve tab staat in ?tab= zodat links (bv. uit de navigatie) direct de juiste tab openen. */
export function AccountTabs({ initialTab, children }: { initialTab: AccountTab; children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("tab");
  const [tab, setTab] = React.useState<AccountTab>(isAccountTab(fromUrl) ? fromUrl : initialTab);

  // Navigeren naar /account?tab=... terwijl de pagina al open is.
  React.useEffect(() => {
    if (isAccountTab(fromUrl)) setTab(fromUrl);
    else if (!fromUrl) setTab("overzicht");
  }, [fromUrl]);

  function onChange(value: string) {
    if (!isAccountTab(value)) return;
    setTab(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "overzicht") params.delete("tab");
    else params.set("tab", value);
    const qs = params.toString();
    window.history.replaceState(null, "", `${pathname}${qs ? `?${qs}` : ""}`);
  }

  return (
    <Tabs value={tab} onValueChange={onChange}>
      <TabsList aria-label="Onderdelen van je account">
        {accountTabList.map(({ value, label }) => {
          const Icon = icons[value];
          return (
            <TabsTrigger key={value} value={value}>
              <Icon /> {label}
            </TabsTrigger>
          );
        })}
      </TabsList>
      {children}
    </Tabs>
  );
}

/** Wisselt van tab vanuit een knop binnen een tabblad (bv. "Bekijk alle bestellingen"). */
export function TabLink({ tab, children, className }: { tab: AccountTab; children: React.ReactNode; className?: string }) {
  return (
    <Link href={tab === "overzicht" ? "/account" : `/account?tab=${tab}`} scroll={false} className={className}>
      {children}
    </Link>
  );
}
