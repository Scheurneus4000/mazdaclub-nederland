import { LogoMark } from "@/components/layout/logo";
import { Badge } from "@/components/ui/badge";
import type { MembershipView } from "@/lib/membership";
import { cn, formatDate, formatMemberNumber } from "@/lib/utils";

export function membershipStatusBadge(view: MembershipView) {
  switch (view.status) {
    case "ACTIVE":
      return <Badge variant="success">Actief</Badge>;
    case "PENDING":
      return <Badge variant="warning">Betaling openstaand</Badge>;
    case "EXPIRED":
      return <Badge variant="danger">Verlopen</Badge>;
    case "CANCELLED":
      return <Badge variant="secondary">Opgezegd</Badge>;
    default:
      return <Badge variant="outline">Geen lidmaatschap</Badge>;
  }
}

/** Digitale ledenpas in clubstijl. */
export function MemberCard({ name, view, className, logoSrc }: { name: string; view: MembershipView; className?: string; logoSrc?: string }) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-2xl p-6 text-white shadow-[0_20px_50px_-25px_rgba(192,0,0,0.7)] sm:p-7",
        view.active ? "bg-gradient-to-br from-ink via-[#1d1d21] to-[#5c0000]" : "bg-gradient-to-br from-zinc-700 to-zinc-900",
        className,
      )}
    >
      <div className="absolute -top-16 -right-16 -z-10 size-56 rounded-full bg-primary/30 blur-3xl" />
      <div className="flex items-start justify-between gap-4">
        {logoSrc ? (
          <div className="min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="MazdaClub Nederland" className="h-10 w-auto max-w-[170px] object-contain object-left sm:h-11" />
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/60">Ledenpas</p>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <LogoMark className="size-10" />
            <div className="leading-tight">
              <p className="font-display text-sm font-bold uppercase tracking-[0.12em]">
                Mazda<span className="text-primary">Club</span> Nederland
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/60">Ledenpas</p>
            </div>
          </div>
        )}
        {membershipStatusBadge(view)}
      </div>

      <p className="mt-10 font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">{name}</p>

      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">Lidnummer</dt>
          <dd className="mt-1 font-mono text-base font-semibold tracking-wider">{view.memberNumber ? formatMemberNumber(view.memberNumber) : "—"}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">Geldig tot</dt>
          <dd className="mt-1 text-base font-semibold">{view.currentPeriodEnd ? formatDate(view.currentPeriodEnd) : "—"}</dd>
        </div>
      </dl>
      {view.status !== "NONE" && (
        <p className="mt-4 text-xs text-white/60">Automatische verlenging: {view.autoRenew ? "aan" : "uit"}</p>
      )}
    </div>
  );
}
