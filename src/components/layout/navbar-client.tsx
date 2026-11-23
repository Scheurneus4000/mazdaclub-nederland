"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Menu, ShieldCheck, ShoppingBag, UserRound } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/components/shop/cart-provider";
import { accountNavItem, mainNav } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Logo, type LogoImages } from "./logo";

type NavUser = { name: string; email: string; isAdmin: boolean; isMember: boolean } | null;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavbarClient({
  user,
  announcement,
  logo,
  membershipPriceLabel,
}: {
  user: NavUser;
  announcement?: string;
  logo?: LogoImages;
  /** Bijv. "€ 50,00" – uit Beheer → Instellingen → Lidmaatschap. */
  membershipPriceLabel?: string;
}) {
  const pathname = usePathname();
  const { count } = useCart();
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const isHome = pathname === "/";
  const inAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const transparent = isHome && !scrolled && !open;

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => setOpen(false), [pathname]);

  const linkClass = (href: string) =>
    cn(
      "relative whitespace-nowrap px-2.5 py-2 text-[13px] font-semibold uppercase tracking-[0.08em] transition-colors 2xl:px-3",
      "after:absolute after:inset-x-2.5 after:-bottom-0.5 2xl:after:inset-x-3 after:h-0.5 after:origin-left after:scale-x-0 after:bg-primary after:transition-transform after:duration-300 hover:after:scale-x-100",
      isActive(pathname, href) && "after:scale-x-100",
      transparent ? "text-white/90 hover:text-white" : "text-ink/80 hover:text-ink",
      isActive(pathname, href) && (transparent ? "text-white" : "text-ink"),
    );

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-all duration-300",
          transparent ? "bg-gradient-to-b from-black/60 to-transparent" : "border-b border-border/80 bg-white/95 shadow-[0_1px_12px_rgba(0,0,0,0.04)] backdrop-blur-md",
        )}
      >
        {announcement && (
          <div className="bg-primary px-4 py-1.5 text-center text-xs font-medium text-white">{announcement}</div>
        )}
        <nav className="container-site flex h-[72px] items-center justify-between gap-4" aria-label="Hoofdnavigatie">
          <Logo inverted={transparent} images={logo} />

          <ul className="hidden items-center xl:flex">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={linkClass(item.href)} aria-current={isActive(pathname, item.href) ? "page" : undefined}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1.5">
            {user?.isAdmin &&
              (inAdmin ? (
                <Button asChild size="sm" className="hidden h-9 lg:inline-flex" title="Terug naar de website">
                  <Link href="/">
                    <LogOut /> Beheerdermodus verlaten
                  </Link>
                </Button>
              ) : (
                <Button
                  asChild
                  variant={transparent ? "outline-light" : "outline"}
                  size="sm"
                  className="hidden h-9 border-primary/40 lg:inline-flex"
                  title="Open het beheer van de website"
                >
                  <Link href="/admin">
                    <ShieldCheck className="text-primary" /> Beheerdermodus
                  </Link>
                </Button>
              ))}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className={cn("hidden h-9 sm:inline-flex", transparent && "text-white hover:bg-white/10 hover:text-white")}>
                    <UserRound /> <span className={cn(user.isAdmin && "xl:max-2xl:sr-only")}>{accountNavItem.label}</span> <ChevronDown className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="normal-case tracking-normal">
                    <span className="block text-sm font-semibold text-foreground">{user.name}</span>
                    <span className="block truncate text-xs font-normal">{user.email}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/account">
                      <UserRound /> Mijn overzicht
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account?tab=bestellingen">
                      <ShoppingBag /> Bestellingen
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      void logout();
                    }}
                  >
                    <LogOut /> Uitloggen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="ghost" size="sm" className={cn("hidden h-9 sm:inline-flex", transparent && "text-white hover:bg-white/10 hover:text-white")}>
                <Link href="/inloggen">
                  <UserRound /> {accountNavItem.label}
                </Link>
              </Button>
            )}

            <Button
              asChild
              variant="ghost"
              size="icon"
              className={cn("relative", transparent && "text-white hover:bg-white/10 hover:text-white")}
            >
              <Link href="/winkelwagen" aria-label={`Winkelwagen, ${count} artikel${count === 1 ? "" : "en"}`}>
                <ShoppingBag className="size-5" />
                {count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white ring-2 ring-white">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </Link>
            </Button>

            {!user?.isMember && (
              <Button asChild size="sm" className="hidden h-9 lg:inline-flex">
                <Link href="/lid-worden">Word lid</Link>
              </Button>
            )}

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className={cn("xl:hidden", transparent && "text-white hover:bg-white/10 hover:text-white")} aria-label="Menu openen">
                  <Menu className="size-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="overflow-y-auto p-0">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="border-b px-5 py-5">
                  <Logo images={logo} />
                </div>
                <ul className="flex flex-col px-3 py-3">
                  {[...mainNav, accountNavItem].map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center justify-between rounded-md px-3 py-3 font-display text-base font-semibold uppercase tracking-wide",
                          isActive(pathname, item.href) ? "bg-accent text-primary" : "text-ink hover:bg-muted",
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                {user?.isAdmin && (
                  <div className="border-t px-5 py-4">
                    {inAdmin ? (
                      <Button asChild className="w-full">
                        <Link href="/">
                          <LogOut /> Beheerdermodus verlaten
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild variant="outline" className="w-full border-primary/40">
                        <Link href="/admin">
                          <ShieldCheck className="text-primary" /> Beheerdermodus
                        </Link>
                      </Button>
                    )}
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                      {inAdmin ? "Je beheert nu de website." : "Alleen zichtbaar voor beheerders."}
                    </p>
                  </div>
                )}
                <div className="mt-auto space-y-2 border-t p-5">
                  {user ? (
                    <form action={logout}>
                      <Button variant="outline" className="w-full" type="submit">
                        <LogOut /> Uitloggen
                      </Button>
                    </form>
                  ) : (
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/inloggen">Inloggen</Link>
                    </Button>
                  )}
                  {!user?.isMember && (
                    <Button asChild className="w-full">
                      <Link href="/lid-worden">{membershipPriceLabel ? `Word lid – ${membershipPriceLabel} per jaar` : "Word lid"}</Link>
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>
      {/* Ruimte onder de vaste navigatie (behalve op de homepagina, waar de hero eronder doorloopt). */}
      {!isHome && <div aria-hidden className={announcement ? "h-[100px]" : "h-[72px]"} />}
    </>
  );
}
