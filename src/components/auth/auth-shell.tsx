import Image from "next/image";
import { CalendarCheck, Percent, ShieldCheck } from "lucide-react";
import { getContent } from "@/lib/content";
import { getPricing } from "@/lib/settings";

/** Gesplitste layout voor inloggen/registreren/wachtwoordherstel: formulier links, sfeerbeeld rechts. */
export async function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [{ authImage }, { memberDiscountPercent }] = await Promise.all([getContent(), getPricing()]);
  return (
    <section className="container-site py-8 sm:py-14">
      <div className="grid overflow-hidden rounded-3xl border border-border bg-white shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)] lg:grid-cols-[1.05fr_1fr]">
        <div className="flex flex-col justify-center px-5 py-10 sm:px-10 sm:py-14 lg:px-14">
          <div className="mx-auto w-full max-w-md">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="heading-md mt-4">{title}</h1>
            {description && <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{description}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">{footer}</div>}
          </div>
        </div>

        <div className="relative hidden min-h-[620px] bg-ink lg:block">
          {authImage ? (
            <Image src={authImage} alt="" fill sizes="50vw" className="object-cover" priority />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(192,0,0,0.45),transparent_60%)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
          <div className="absolute inset-x-0 bottom-0 p-12 text-white">
            <p className="font-display text-3xl font-bold uppercase leading-tight tracking-tight">
              Eén club.
              <br />
              <span className="text-primary">Eén passie.</span>
            </p>
            <ul className="mt-8 space-y-3 text-sm text-white/80">
              <li className="flex items-center gap-3">
                <CalendarCheck className="size-4 text-primary" /> Leden rijden gratis mee met alle evenementen
              </li>
              <li className="flex items-center gap-3">
                <Percent className="size-4 text-primary" /> {memberDiscountPercent}% ledenkorting in de webshop
              </li>
              <li className="flex items-center gap-3">
                <ShieldCheck className="size-4 text-primary" /> Je gegevens zijn veilig en AVG-proof opgeslagen
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
