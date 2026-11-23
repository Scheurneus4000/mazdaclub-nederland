"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2, MailCheck, MailWarning } from "lucide-react";
import { toast } from "sonner";
import { resendMyVerification, type ResendState } from "@/app/(site)/e-mail-bevestigen/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Melding voor ingelogde gebruikers met een nog niet bevestigd e-mailadres, met een knop om de
 * bevestigingsmail opnieuw te sturen. Toon hem alleen als `emailVerifiedAt` leeg is.
 */
export function EmailVerificationBanner({ email, isOwner = false, className }: { email: string; isOwner?: boolean; className?: string }) {
  const [state, action, pending] = useActionState<ResendState>(resendMyVerification, {});

  React.useEffect(() => {
    if (!state.at) return;
    if (state.error) toast.error(state.error);
    else if (state.message) toast.success(state.message);
  }, [state]);

  return (
    <div
      role="status"
      className={cn("flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 sm:flex-row sm:items-center sm:justify-between", className)}
    >
      <div className="flex gap-3">
        {state.ok ? <MailCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : <MailWarning className="mt-0.5 size-5 shrink-0 text-amber-600" />}
        <div className="text-sm">
          <p className="font-semibold">Bevestig je e-mailadres</p>
          <p className="mt-0.5 text-amber-900/80">
            {state.ok
              ? `Kijk in je inbox (en spammap) van ${email} en klik op de link in de e-mail.`
              : `We hebben een e-mail gestuurd naar ${email}. Klik op de link daarin, zodat bevestigingen en belangrijke berichten zeker aankomen.`}
            {isOwner && !state.ok && " Na bevestiging krijg je automatisch toegang tot de beheerdermodus."}
          </p>
        </div>
      </div>
      <form action={action} className="shrink-0">
        <Button type="submit" variant="outline" size="sm" disabled={pending} className="border-amber-300 bg-white">
          {pending && <Loader2 className="animate-spin" />}
          Opnieuw sturen
        </Button>
      </form>
    </div>
  );
}
