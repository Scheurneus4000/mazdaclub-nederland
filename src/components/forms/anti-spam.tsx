"use client";

import * as React from "react";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void; "expired-callback"?: () => void; language?: string }) => string;
      reset: (id?: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/**
 * Botbescherming voor client-formulieren. Gebruik:
 *   const spam = useAntiSpam();
 *   <form>{spam.fields} ...</form>
 *   fetch(url, { body: JSON.stringify({ ...data, ...spam.values() }) })
 */
export function useAntiSpam() {
  const startedAt = React.useRef<number>(0);
  const honeypot = React.useRef<HTMLInputElement>(null);
  const [token, setToken] = React.useState<string | undefined>();
  const widgetRef = React.useRef<HTMLDivElement>(null);
  const widgetId = React.useRef<string | null>(null);

  React.useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const renderWidget = React.useCallback(() => {
    if (!SITE_KEY || !widgetRef.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(widgetRef.current, {
      sitekey: SITE_KEY,
      language: "nl",
      callback: setToken,
      "expired-callback": () => setToken(undefined),
    });
  }, []);

  React.useEffect(() => {
    renderWidget();
  }, [renderWidget]);

  const fields = (
    <>
      {/* Honeypot: onzichtbaar voor mensen, bots vullen het in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden" tabIndex={-1}>
        <label htmlFor="website">Website</label>
        <input ref={honeypot} id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      {SITE_KEY && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={renderWidget} />
          <div ref={widgetRef} className="min-h-[65px]" />
        </>
      )}
    </>
  );

  const values = React.useCallback(
    () => ({ website: honeypot.current?.value ?? "", formStartedAt: startedAt.current, turnstileToken: token }),
    [token],
  );

  const reset = React.useCallback(() => {
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
    setToken(undefined);
  }, []);

  return { fields, values, reset };
}
