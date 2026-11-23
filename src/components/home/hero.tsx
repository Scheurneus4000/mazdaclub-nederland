"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, ChevronDown, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HeroProps = {
  images: Array<{ src: string; alt: string }>;
  eyebrow: string;
  title: string;
  subtitle: string;
  stats: Array<{ value: string; label: string }>;
};

export function Hero({ images, eyebrow, title, subtitle, stats }: HeroProps) {
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    if (images.length < 2) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = window.setInterval(() => setActive((i) => (i + 1) % images.length), 7000);
    return () => window.clearInterval(t);
  }, [images.length]);

  return (
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-ink text-white" aria-label="Welkom bij MazdaClub Nederland">
      {images.map((img, i) => (
        <div
          key={img.src}
          className={cn("absolute inset-0 -z-20 transition-opacity duration-[1600ms] ease-in-out", i === active ? "opacity-100" : "opacity-0")}
          aria-hidden={i !== active}
        >
          <Image
            src={img.src}
            alt={img.alt}
            fill
            priority={i === 0}
            sizes="100vw"
            className={cn("object-cover", i === active && "animate-hero-zoom")}
          />
        </div>
      ))}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/85 via-black/55 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />

      <div className="container-site flex flex-1 flex-col justify-center pt-32 pb-16">
        <div className="max-w-3xl">
          <p className="eyebrow animate-fade-up text-white [&::before]:bg-primary">{eyebrow}</p>
          <h1 className="heading-xl mt-6 animate-fade-up [animation-delay:120ms]">{title}</h1>
          <p className="mt-6 max-w-xl animate-fade-up text-base leading-relaxed text-white/75 [animation-delay:240ms] sm:text-lg">{subtitle}</p>

          <div className="mt-10 flex animate-fade-up flex-col gap-3 [animation-delay:360ms] sm:flex-row sm:flex-wrap">
            <Button asChild size="lg" className="shadow-[0_10px_30px_-10px_rgba(192,0,0,0.8)]">
              <Link href="/lid-worden">
                Word lid <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline-light">
              <Link href="/evenementen">
                <CalendarDays /> Bekijk evenementen
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline-light">
              <Link href="/webshop">
                <ShoppingBag /> Bezoek webshop
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container-site pb-8">
        <div className="flex flex-col gap-8 border-t border-white/15 pt-8 md:flex-row md:items-end md:justify-between">
          <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4 md:gap-12">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-display text-3xl font-bold sm:text-4xl">{s.value}</dd>
                <dd className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-white/60">{s.label}</dd>
              </div>
            ))}
          </dl>
          {images.length > 1 && (
            <div className="flex items-center gap-2" role="tablist" aria-label="Kies sfeerbeeld">
              {images.map((img, i) => (
                <button
                  key={img.src}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  aria-label={`Sfeerbeeld ${i + 1}`}
                  onClick={() => setActive(i)}
                  className={cn("h-1 cursor-pointer rounded-full transition-all duration-500", i === active ? "w-10 bg-primary" : "w-5 bg-white/40 hover:bg-white/70")}
                />
              ))}
            </div>
          )}
        </div>
        <a href="#over-de-club" className="mx-auto mt-6 hidden w-fit items-center gap-1 text-xs font-medium uppercase tracking-[0.2em] text-white/50 hover:text-white md:flex">
          Ontdek de club <ChevronDown className="size-4 animate-bounce" />
        </a>
      </div>
    </section>
  );
}
