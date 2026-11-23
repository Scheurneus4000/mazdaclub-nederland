"use client";

import * as React from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteAccount, type AccountActionState } from "@/app/(site)/account/actions";
import { Button } from "@/components/ui/button";
import { Alert, Field } from "@/components/ui/form-controls";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function DeleteAccountDialog({ hasActiveMembership }: { hasActiveMembership: boolean }) {
  const [confirmation, setConfirmation] = React.useState("");
  const [state, action, pending] = React.useActionState<AccountActionState, FormData>(deleteAccount, null);
  const canSubmit = confirmation.trim().toUpperCase() === "VERWIJDER";

  return (
    <Dialog onOpenChange={(open) => !open && setConfirmation("")}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 /> Account verwijderen
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={action} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Account definitief verwijderen?</DialogTitle>
            <DialogDescription>Dit kan niet ongedaan worden gemaakt.</DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>Je profiel, inloggegevens en lidmaatschap worden direct verwijderd.</li>
            {hasActiveMembership && <li>Je ledenvoordelen vervallen direct; een eventuele automatische verlenging wordt stopgezet.</li>}
            <li>Inschrijvingen voor afgelopen evenementen worden geanonimiseerd.</li>
            <li>Bestellingen en betalingen bewaren we 7 jaar vanwege de wettelijke fiscale bewaarplicht, losgekoppeld van je account.</li>
          </ul>
          {state && !state.ok && state.error && <Alert variant="error">{state.error}</Alert>}
          <Field label='Typ "VERWIJDER" om te bevestigen' htmlFor="confirmation" error={state?.fields?.confirmation}>
            <Input
              id="confirmation"
              name="confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              autoComplete="off"
              className="uppercase"
            />
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annuleren
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={!canSubmit || pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Trash2 />} Definitief verwijderen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
