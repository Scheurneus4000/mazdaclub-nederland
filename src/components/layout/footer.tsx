import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { getContent } from "@/lib/content";
import { legalNav, mainNav } from "@/lib/site";
import { CookieSettingsButton } from "./cookie-banner";
import { Logo } from "./logo";
import { FacebookIcon, InstagramIcon, TiktokIcon, YoutubeIcon } from "./social-icons";

export async function Footer() {
  const c = await getContent();
  const socials = [
    { href: c.instagramUrl, label: "Instagram", Icon: InstagramIcon },
    { href: c.facebookUrl, label: "Facebook", Icon: FacebookIcon },
    { href: c.youtubeUrl, label: "YouTube", Icon: YoutubeIcon },
    { href: c.tiktokUrl, label: "TikTok", Icon: TiktokIcon },
  ].filter((s) => s.href);

  return (
    <footer className="relative mt-24 bg-ink text-white">
      <div className="h-1 w-full bg-gradient-to-r from-primary via-primary to-primary/40" />
      <div className="container-site grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Logo
            inverted
            images={{ logo: c.logoUrl || undefined, logoInverted: c.logoInvertedUrl || undefined }}
            imgClassName="h-14 max-w-[230px] sm:h-14 sm:max-w-[230px] 2xl:h-16 2xl:max-w-[260px]"
          />
          {c.footerText && <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/60">{c.footerText}</p>}
          {socials.length > 0 && (
            <ul className="mt-6 flex gap-2">
              {socials.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`MazdaClub Nederland op ${label}`}
                    className="flex size-10 items-center justify-center rounded-full border border-white/15 text-white/80 transition-colors hover:border-primary hover:bg-primary hover:text-white"
                  >
                    <Icon className="size-[18px]" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2">
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-white">Navigatie</h2>
          <ul className="mt-5 space-y-3 text-sm">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-white/60 transition-colors hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-2">
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-white">Leden</h2>
          <ul className="mt-5 space-y-3 text-sm">
            <li><Link href="/lid-worden" className="text-white/60 hover:text-white">Lidmaatschap</Link></li>
            <li><Link href="/account" className="text-white/60 hover:text-white">Mijn Account</Link></li>
            <li><Link href="/account?tab=inschrijvingen" className="text-white/60 hover:text-white">Mijn inschrijvingen</Link></li>
            <li><Link href="/verzending" className="text-white/60 hover:text-white">Verzending & retour</Link></li>
          </ul>
        </div>

        <div className="lg:col-span-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-white">Contact</h2>
          <ul className="mt-5 space-y-4 text-sm text-white/70">
            {c.contactEmail && (
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
                <a href={`mailto:${c.contactEmail}`} className="break-all hover:text-white">{c.contactEmail}</a>
              </li>
            )}
            {c.contactPhone && (
              <li className="flex gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
                <a href={`tel:${c.contactPhone.replace(/[^+0-9]/g, "")}`} className="hover:text-white">{c.contactPhone}</a>
              </li>
            )}
            {c.contactAddress && (
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{c.contactAddress}</span>
              </li>
            )}
          </ul>
          <Link href="/contact" className="mt-6 inline-flex text-sm font-semibold text-white underline decoration-primary decoration-2 underline-offset-4 hover:text-primary">
            Stuur ons een bericht →
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-site flex flex-col gap-4 py-6 text-xs text-white/50 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} MazdaClub Nederland{c.kvkNumber ? ` · KvK ${c.kvkNumber}` : ""}. MazdaClub Nederland is een onafhankelijke vereniging en geen
            onderdeel van Mazda Motor Corporation.
          </p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {legalNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-white">{item.label}</Link>
              </li>
            ))}
            <li>
              <CookieSettingsButton className="hover:text-white" />
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
