"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { postJson } from "@/lib/client-fetch";

/** Zet de automatische jaarlijkse verlenging stop (het lidmaatschap blijft geldig tot de einddatum). */
export function CancelRenewalButton({ validUntil }: { validUntil: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function confirm() {
    setBusy(true);
    const res = await postJson<{ ok: true }>("/api/membership/cancel-renewal", {});
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setOpen(false);
    toast.success("Automatische verlenging is stopgezet.");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Automatische verlenging stopzetten</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Automatische verlenging stopzetten?</DialogTitle>
          <DialogDescription>
            Je lidmaatschap blijft geldig tot en met {validUntil}. Daarna wordt het niet automatisch verlengd en vervallen je
            ledenvoordelen. Je kunt op elk moment handmatig verlengen.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuleren</Button>
          </DialogClose>
          <Button variant="destructive" onClick={confirm} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Ja, stopzetten
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
