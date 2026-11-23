import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { ContentForm, type ContentFormField } from "@/components/admin/content-form";
import { AdminPageHeader } from "@/components/admin/page-title";
import { contentDefaults, contentFields, contentTabs, getRawContent, type ContentTab } from "@/lib/content";
import { pricingPlaceholderHelp } from "@/lib/pricing";
import { requireAdmin } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Teksten & afbeeldingen" };
export const dynamic = "force-dynamic";

const previewLinks: Record<string, { href: string; label: string }> = {
  home: { href: "/", label: "Homepagina bekijken" },
  paginas: { href: "/evenementen", label: "Pagina's bekijken" },
  afbeeldingen: { href: "/", label: "Website bekijken" },
  contact: { href: "/contact", label: "Contactpagina bekijken" },
};

export default async function AdminContentPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  const { tab: tabParam } = await searchParams;
  const tab = (contentTabs.find((t) => t.id === tabParam)?.id ?? "home") as ContentTab;
  const content = await getRawContent();
  const active = contentTabs.find((t) => t.id === tab)!;

  const fields: ContentFormField[] = contentFields
    .filter((f) => f.tab === tab)
    .map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      group: f.group,
      help: f.help,
      maxLength: f.maxLength,
      required: f.required,
      value: content[f.key] ?? "",
      defaultValue: contentDefaults[f.key],
    }));

  return (
    <>
      <AdminPageHeader
        title="Teksten & afbeeldingen"
        description="Pas teksten, foto's en het clublogo van de website aan. Je hoeft niets van code te weten: wijzig een veld en klik op opslaan."
        actions={
          <Link href={previewLinks[tab].href} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            <ExternalLink className="size-4" /> {previewLinks[tab].label}
          </Link>
        }
      />

      <nav aria-label="Onderdelen" className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-border bg-white p-1.5 [scrollbar-width:none]">
        {contentTabs.map((t) => (
          <Link
            key={t.id}
            href={`/admin/content?tab=${t.id}`}
            aria-current={t.id === tab ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              t.id === tab ? "bg-primary text-white" : "text-foreground/70 hover:bg-muted hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <p className="mb-6 text-sm text-muted-foreground">
        {active.description}
        {(tab === "home" || tab === "paginas") && ` ${pricingPlaceholderHelp}`}
        {tab === "afbeeldingen" &&
          " Foto's met het label 'Tijdelijke foto' zijn rechtenvrije sfeerbeelden die je kunt vervangen door eigen clubfoto's. Uploads worden automatisch verkleind en geoptimaliseerd."}
      </p>

      <ContentForm key={tab} fields={fields} />
    </>
  );
}
