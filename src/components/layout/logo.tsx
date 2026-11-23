import Link from "next/link";
import { cn } from "@/lib/utils";

/** Logo-afbeeldingen uit Beheer → Teksten & afbeeldingen → Logo. */
export type LogoImages = { logo?: string; logoInverted?: string };

/** Tijdelijk embleem (bewust géén Mazda-merklogo), totdat het clublogo is geüpload. */
export function LogoMark({ className, src }: { className?: string; src?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={cn("size-9 object-contain", className)} />;
  }
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <rect width="40" height="40" rx="9" fill="#C00000" />
      <path d="M8 27.5 14.5 12h2.6l3.4 8.6 3.4-8.6h2.6L33 27.5h-3.3l-4.4-10.7-3.6 9h-2.4l-3.6-9-4.4 10.7Z" fill="#fff" />
    </svg>
  );
}

export function Logo({
  className,
  imgClassName,
  inverted = false,
  images,
}: {
  className?: string;
  /** Afmetingen van het logo (standaard passend in de menubalk). */
  imgClassName?: string;
  inverted?: boolean;
  images?: LogoImages;
}) {
  const uploaded = inverted ? images?.logoInverted || images?.logo : images?.logo;

  if (uploaded) {
    return (
      <Link href="/" className={cn("group flex shrink-0 items-center", className)} aria-label="MazdaClub Nederland – home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={uploaded}
          alt="MazdaClub Nederland"
          className={cn(
            "h-9 w-auto max-w-[150px] object-contain object-left transition-transform duration-300 group-hover:scale-[1.03] sm:h-10 sm:max-w-[170px] 2xl:h-11 2xl:max-w-[190px]",
            imgClassName,
          )}
        />
      </Link>
    );
  }

  return (
    <Link href="/" className={cn("group flex items-center gap-2.5", className)} aria-label="MazdaClub Nederland – home">
      <LogoMark className="transition-transform duration-300 group-hover:scale-105" />
      <span className="flex flex-col leading-none">
        <span className={cn("font-display text-[17px] font-bold uppercase tracking-[0.08em]", inverted ? "text-white" : "text-ink")}>
          Mazda<span className="text-primary">Club</span>
        </span>
        <span className={cn("mt-1 text-[10px] font-semibold uppercase tracking-[0.32em]", inverted ? "text-white/60" : "text-muted-foreground")}>
          Nederland
        </span>
      </span>
    </Link>
  );
}
