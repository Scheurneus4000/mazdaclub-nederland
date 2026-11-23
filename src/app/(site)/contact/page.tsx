import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Clock, Mail, MapPin, Phone, ShoppingBag, UserRound } from "lucide-react";
import { auth } from "@/auth";
import { ContactForm } from "@/components/contact/contact-form";
import { PageHeader } from "@/components/layout/page-header";
import { FacebookIcon, InstagramIcon, TiktokIcon, YoutubeIcon } from "@/components/layout/social-icons";
import { getContent } from "@/lib/content";

export const metadata: Metadata = {
  title: "Contact",
  description: "Neem contact op met MazdaClub Nederland over het lidmaatschap, evenementen, bestellingen of samenwerkingen.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const [c, session] = await Promise.all([getContent(), auth()]);

  const socials = [
    { href: c.instagramUrl, label: "Instagram", Icon: InstagramIcon },
    { href: c.facebookUrl, label: "Facebook", Icon: FacebookIcon },
    { href: c.youtubeUrl, label: "YouTube", Icon: YoutubeIcon },
    { href: c.tiktokUrl, label: "TikTok", Icon: TiktokIcon },
  ].filter((s) => s.href);

  const contactItems: Array<{ icon: typeof Mail; label: string; value: string; href?: string }> = [
    { icon: Mail, label: "E-mail", value: c.contactEmail, href: `mailto:${c.contactEmail}` },
    { icon: Phone, label: "Telefoon", value: c.contactPhone, href: `tel:${c.contactPhone.replace(/[^+0-9]/g, "")}` },
    { icon: MapPin, label: "Postadres", value: c.contactAddress },
    { icon: Clock, label: "Bereikbaarheid", value: c.contactResponseTime },
  ].filter((item) => item.value);

  const quickLinks = [
    { icon: UserRound, title: "Lidmaatschap", text: "Status, verlenging en ledenvoordelen", href: "/account?tab=lidmaatschap" },
    { icon: ShoppingBag, title: "Bestellingen", text: "Volg je bestelling of bekijk verzendinformatie", href: "/verzending" },
    { icon: CalendarDays, title: "Evenementen", text: "Agenda en je inschrijvingen", href: "/evenementen" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title={c.pageContactTitle}
        description={c.pageContactText}
        image={c.pageContactImage || undefined}
        breadcrumbs={[{ label: "Contact" }]}
      />

      <div className="container-site grid gap-12 py-14 sm:py-20 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-16">
        <aside className="space-y-8">
          <ul className="space-y-3">
            {contactItems.map(({ icon: Icon, label, value, href }) => (
              <li key={label} className="flex items-start gap-4 rounded-2xl border border-border p-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
                  {href ? (
                    <a href={href} className="mt-0.5 block break-words font-semibold hover:text-primary">
                      {value}
                    </a>
                  ) : (
                    <p className="mt-0.5 font-semibold">{value}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {socials.length > 0 && (
            <div>
              <p className="text-sm font-semibold">Volg de club</p>
              <ul className="mt-3 flex gap-2">
                {socials.map(({ href, label, Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`MazdaClub Nederland op ${label}`}
                      className="flex size-11 items-center justify-center rounded-full border border-border text-ink transition-colors hover:border-primary hover:bg-primary hover:text-white"
                    >
                      <Icon className="size-[18px]" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl bg-surface p-6">
            <p className="font-display text-sm font-bold uppercase tracking-[0.16em]">Snel geregeld</p>
            <ul className="mt-4 space-y-2">
              {quickLinks.map(({ icon: Icon, title, text, href }) => (
                <li key={title}>
                  <Link href={href} className="group flex items-center gap-3 rounded-lg p-2 -mx-2 transition-colors hover:bg-white">
                    <Icon className="size-5 shrink-0 text-primary" />
                    <span>
                      <span className="block text-sm font-semibold group-hover:text-primary">{title}</span>
                      <span className="block text-xs text-muted-foreground">{text}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {c.kvkNumber && <p className="text-xs text-muted-foreground">KvK-nummer {c.kvkNumber}</p>}
        </aside>

        <section aria-labelledby="contactformulier" className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-10">
          <h2 id="contactformulier" className="heading-md">
            Stuur ons een bericht
          </h2>
          <p className="mt-2 mb-8 text-muted-foreground">Vul het formulier in en we nemen zo snel mogelijk contact met je op.</p>
          <ContactForm defaults={session?.user ? { name: session.user.name ?? undefined, email: session.user.email ?? undefined } : undefined} />
        </section>
      </div>
    </>
  );
}
