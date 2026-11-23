import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Crumb = { label: string; href?: string };

/** Uniforme paginakop voor alle publieke subpagina's (met optionele achtergrondfoto en breadcrumbs). */
export function PageHeader({
  eyebrow,
  title,
  description,
  image,
  breadcrumbs,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  image?: string;
  breadcrumbs?: Crumb[];
  children?: React.ReactNode;
  className?: string;
}) {
  const crumbs: Crumb[] = [{ label: "Home", href: "/" }, ...(breadcrumbs ?? [])];
  return (
    <section className={cn("relative isolate overflow-hidden bg-ink text-white", className)}>
      {image && (
        <>
          <Image src={image} alt="" fill priority sizes="100vw" className="-z-20 object-cover opacity-60" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/85 to-ink/30" />
        </>
      )}
      {!image && <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(192,0,0,0.35),transparent_55%)]" />}
      <div className="container-site py-14 sm:py-20">
        <nav aria-label="Kruimelpad" className="mb-6">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-white/60">
            {crumbs.map((c, i) => (
              <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="size-3" />}
                {c.href && i < crumbs.length - 1 ? (
                  <Link href={c.href} className="hover:text-white">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current={i === crumbs.length - 1 ? "page" : undefined} className={i === crumbs.length - 1 ? "text-white" : ""}>
                    {c.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
        <h1 className="heading-lg max-w-3xl">{title}</h1>
        {description && <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">{description}</p>}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}

/** Lege-staat blok voor overzichten zonder resultaten. */
export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
      {icon && <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-accent text-primary [&_svg]:size-6">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
