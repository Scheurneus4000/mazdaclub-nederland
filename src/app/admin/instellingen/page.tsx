import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, CircleHelp, XCircle } from "lucide-react";
import { ContentForm, type ContentFormField } from "@/components/admin/content-form";
import { AdminSection } from "@/components/admin/page-title";
import { contentDefaults, contentFields, getRawContent } from "@/lib/content";
import { requireAdmin } from "@/lib/session";
import { getSystemChecks, type StatusLevel } from "@/lib/system-status";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Instellingen" };
export const dynamic = "force-dynamic";

const levelStyle: Record<StatusLevel, { icon: typeof CheckCircle2; className: string; label: string }> = {
  ok: { icon: CheckCircle2, className: "text-emerald-600", label: "In orde" },
  warning: { icon: AlertTriangle, className: "text-amber-600", label: "Aandacht" },
  error: { icon: XCircle, className: "text-destructive", label: "Nodig voor livegang" },
};

export default async function AdminSettingsPage() {
  await requireAdmin();
  const [content, checks] = await Promise.all([getRawContent(), getSystemChecks()]);

  const fields: ContentFormField[] = contentFields
    .filter((f) => f.tab === "instellingen")
    .map((f) => ({ ...f, value: content[f.key] ?? "", defaultValue: contentDefaults[f.key] }));

  const open = checks.filter((c) => c.level !== "ok").length;

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_440px]">
      <AdminSection
        title="Status van de website"
        description={open === 0 ? "Alles is ingesteld en klaar voor gebruik." : `${open} onderdeel${open === 1 ? "" : "en"} vraagt aandacht.`}
        bodyClassName="p-0"
        className="h-fit"
      >
        <ul className="divide-y divide-border">
          {checks.map((c) => {
            const s = levelStyle[c.level];
            return (
              <li key={c.id} className="flex gap-3 px-5 py-4">
                <s.icon className={cn("mt-0.5 size-5 shrink-0", s.className)} aria-label={s.label} />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold">{c.title}</p>
                  <p className="mt-0.5 text-muted-foreground">{c.summary}</p>
                  {c.action && <p className="mt-1.5 rounded-md bg-surface px-3 py-2 text-xs leading-relaxed">{c.action}</p>}
                </div>
                {c.href && (
                  <Link href={c.href} className="mt-0.5 inline-flex h-fit shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    Instellen <ArrowRight className="size-3.5" />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
        <p className="flex items-center gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground">
          <CircleHelp className="size-4 shrink-0" /> Onderdelen zonder knop stel je één keer in bij de hosting.{" "}
          <Link href="/admin/hulp#livegang" className="font-medium text-primary hover:underline">
            Meer uitleg
          </Link>
        </p>
      </AdminSection>

      <div className="space-y-6">
        <ContentForm fields={fields} submitLabel="Opslaan" />
      </div>
    </div>
  );
}
