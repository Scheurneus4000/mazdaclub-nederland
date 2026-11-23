"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { refundPaymentAction } from "@/app/admin/actions/payments";
import type { ActionState } from "@/app/admin/actions/state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";

/** Venster om een betaalde online betaling volledig of gedeeltelijk terug te betalen. */
export function RefundDialog({
  paymentId,
  amountLabel,
  description,
  providerLabel,
  compact = false,
}: {
  paymentId: string;
  amountLabel: string;
  description: string;
  providerLabel: string;
  compact?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"full" | "partial">("full");
  const [state, action, pending] = useActionState(refundPaymentAction, {} as ActionState);

  React.useEffect(() => {
    if (!state.at) return;
    if (state.error) {
      toast.error(state.error);
      return;
    }
    if (state.message) toast.success(state.message);
    setOpen(false);
    setMode("full");
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" title="Terugbetalen">
          <Undo2 />
          {!compact && "Terugbetalen"}
          {compact && <span className="sr-only">Terugbetalen</span>}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Betaling terugbetalen</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2">
              <p>
                <strong className="text-foreground">{description}</strong> · {amountLabel} via {providerLabel}
              </p>
              <p>Het geld gaat via {providerLabel} terug naar de rekening of kaart waarmee is betaald. Dit kun je niet ongedaan maken.</p>
              <p>Bij een volledige terugbetaling wordt een bestelling op &quot;Terugbetaald&quot; gezet en een inschrijving geannuleerd. Een lidmaatschap pas je daarna zelf aan bij de gebruiker.</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-5">
          <input type="hidden" name="id" value={paymentId} />
          <input type="hidden" name="mode" value={mode} />
          <fieldset className="space-y-2 text-sm">
            <legend className="sr-only">Bedrag</legend>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="refundMode" checked={mode === "full"} onChange={() => setMode("full")} className="accent-primary" />
              Volledig terugbetalen ({amountLabel})
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="refundMode" checked={mode === "partial"} onChange={() => setMode("partial")} className="accent-primary" />
              Een deel terugbetalen
            </label>
          </fieldset>
          {mode === "partial" && (
            <Field label="Bedrag (€)" htmlFor={`refund-${paymentId}`} hint={`Maximaal ${amountLabel}`}>
              <Input id={`refund-${paymentId}`} name="amount" inputMode="decimal" placeholder="Bijv. 2,50" autoFocus />
            </Field>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annuleren
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Terugbetalen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
