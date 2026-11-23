import { formatPrice } from "@/lib/utils";

export type RevenueMonth = { key: string; label: string; membership: number; webshop: number; events: number };

const SERIES = [
  { key: "membership", label: "Lidmaatschap", color: "#111114" },
  { key: "webshop", label: "Webshop", color: "#C00000" },
  { key: "events", label: "Evenementen", color: "#F2A3A3" },
] as const;

function niceMax(value: number): number {
  if (value <= 0) return 10000; // € 100
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 2.5, 5, 10];
  for (const s of steps) if (s * magnitude >= value) return s * magnitude;
  return 10 * magnitude;
}

const compactEuro = (cents: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 1 }).format(cents / 100);

/** Gestapelde staafgrafiek (zonder chart-bibliotheek): omzet per maand per bron. */
export function RevenueChart({ months }: { months: RevenueMonth[] }) {
  const totals = months.map((m) => m.membership + m.webshop + m.events);
  const max = niceMax(Math.max(0, ...totals));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);

  return (
    <figure>
      <figcaption className="sr-only">Omzet per maand over de laatste {months.length} maanden, gesplitst naar lidmaatschap, webshop en evenementen.</figcaption>
      <ul className="mb-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
            {s.label}
          </li>
        ))}
      </ul>

      <div className="relative flex h-64 gap-3 pl-14" aria-hidden>
        {/* Rasterlijnen + y-as */}
        <div className="pointer-events-none absolute inset-0 bottom-6 left-14">
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-dashed border-border" style={{ bottom: `${(t / max) * 100}%` }}>
              <span className="absolute -top-2 -left-14 w-12 text-right text-[11px] text-muted-foreground tabular-nums">{compactEuro(t)}</span>
            </div>
          ))}
        </div>

        {months.map((m, i) => {
          const total = totals[i];
          return (
            <div key={m.key} className="relative flex flex-1 flex-col items-center justify-end">
              <div className="flex h-[calc(100%-1.5rem)] w-full max-w-14 flex-col justify-end">
                <span className="mb-1 text-center text-[11px] font-semibold tabular-nums">{total > 0 ? compactEuro(total) : ""}</span>
                <div className="flex w-full shrink-0 flex-col-reverse overflow-hidden rounded-t-md" style={{ height: `${(total / max) * 100}%` }}>
                  {SERIES.map((s) => {
                    const value = m[s.key];
                    if (value <= 0) return null;
                    return (
                      <div
                        key={s.key}
                        title={`${s.label} ${m.label}: ${formatPrice(value)}`}
                        style={{ height: `${(value / Math.max(1, total)) * 100}%`, background: s.color }}
                        className="w-full border-t border-white/60 first:border-t-0"
                      />
                    );
                  })}
                </div>
              </div>
              <span className="mt-2 h-4 text-xs font-medium text-muted-foreground capitalize">{m.label}</span>
            </div>
          );
        })}
      </div>

      <table className="sr-only">
        <thead>
          <tr>
            <th>Maand</th>
            {SERIES.map((s) => (
              <th key={s.key}>{s.label}</th>
            ))}
            <th>Totaal</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m, i) => (
            <tr key={m.key}>
              <td>{m.label}</td>
              {SERIES.map((s) => (
                <td key={s.key}>{formatPrice(m[s.key])}</td>
              ))}
              <td>{formatPrice(totals[i])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
