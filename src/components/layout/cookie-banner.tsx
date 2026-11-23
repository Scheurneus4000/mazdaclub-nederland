"use client";

import * as React from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * AVG-conforme cookiebanner. Standaard staan alleen noodzakelijke cookies aan (sessie,
 * winkelwagen, beveiliging). Analytische/marketingcookies pas na expliciete toestemming.
 * Andere scripts luisteren naar het event "mcn:consent" of lezen getConsent().
 */
export type Consent = { necessary: true; analytics: boolean; marketing: boolean; updatedAt: string; version: 1 };

const KEY = "mcn-cookie-consent";
const OPEN_EVENT = "mcn:open-cookie-settings";

export function getConsent(): Consent | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Consent) : null;
  } catch {
    return null;
  }
}

function saveConsent(analytics: boolean, marketing: boolean) {
  const consent: Consent = { necessary: true, analytics, marketing, updatedAt: new Date().toISOString(), version: 1 };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(consent));
  } catch {
    /* negeren */
  }
  window.dispatchEvent(new CustomEvent("mcn:consent", { detail: consent }));
}

export function CookieBanner() {
  const [visible, setVisible] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(false);
  const [analytics, setAnalytics] = React.useState(false);
  const [marketing, setMarketing] = React.useState(false);

  React.useEffect(() => {
    const existing = getConsent();
    if (!existing) setVisible(true);
    else {
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
    }
    const open = () => {
      setShowDetails(true);
      setVisible(true);
    };
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  if (!visible) return null;

  const decide = (a: boolean, m: boolean) => {
    saveConsent(a, m);
    setVisible(false);
    setShowDetails(false);
  };

  return (
    <div role="dialog" aria-modal="false" aria-labelledby="cookie-title" className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-5">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-white p-5 shadow-[0_10px_50px_rgba(0,0,0,0.18)] sm:p-6">
        <div className="flex items-start gap-4">
          <div className="hidden size-11 shrink-0 items-center justify-center rounded-full bg-accent text-primary sm:flex">
            <Cookie className="size-5" />
          </div>
          <div className="flex-1">
            <h2 id="cookie-title" className="font-display text-lg font-bold uppercase tracking-tight">
              Wij respecteren je privacy
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              We gebruiken noodzakelijke cookies om de website, je winkelwagen en je account te laten werken. Met jouw toestemming
              gebruiken we ook cookies om het gebruik van de site te analyseren. Lees meer in onze{" "}
              <Link href="/privacy#cookies" className="font-medium text-primary underline underline-offset-2">
                privacyverklaring
              </Link>
              .
            </p>

            {showDetails && (
              <div className="mt-4 space-y-3 rounded-lg bg-muted/60 p-4 text-sm">
                <label className="flex items-start gap-3">
                  <input type="checkbox" checked disabled className="mt-0.5 size-4 accent-primary" />
                  <span>
                    <strong className="font-semibold">Noodzakelijk</strong> – altijd actief. Inloggen, winkelwagen, beveiliging en het
                    onthouden van deze keuze.
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mt-0.5 size-4 accent-primary" />
                  <span>
                    <strong className="font-semibold">Analytisch</strong> – anonieme statistieken om de website te verbeteren.
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 size-4 accent-primary" />
                  <span>
                    <strong className="font-semibold">Marketing</strong> – ingesloten media van derden (zoals YouTube) en relevante
                    advertenties.
                  </span>
                </label>
              </div>
            )}

            <div className={cn("mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center")}>
              <Button variant="outline" onClick={() => decide(false, false)}>
                Alleen noodzakelijk
              </Button>
              {showDetails ? (
                <Button variant="outline" onClick={() => decide(analytics, marketing)}>
                  Keuze opslaan
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => setShowDetails(true)}>
                  Instellingen
                </Button>
              )}
              <Button onClick={() => decide(true, true)} className="sm:ml-auto">
                Alles accepteren
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" className={cn("cursor-pointer", className)} onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      Cookie-instellingen
    </button>
  );
}
