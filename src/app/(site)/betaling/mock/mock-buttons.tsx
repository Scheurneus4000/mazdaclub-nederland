"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { postJson } from "@/lib/client-fetch";

const methods = [
  { value: "ideal", label: "iDEAL" },
  { value: "bancontact", label: "Bancontact" },
  { value: "creditcard", label: "Creditcard" },
  { value: "applepay", label: "Apple Pay" },
  { value: "googlepay", label: "Google Pay" },
  { value: "paypal", label: "PayPal" },
];

export function MockCheckoutButtons({ paymentId, disabled }: { paymentId: string; disabled: boolean }) {
  const router = useRouter();
  const [method, setMethod] = React.useState("ideal");
  const [busy, setBusy] = React.useState(false);

  async function finish(status: "PAID" | "FAILED" | "CANCELED") {
    setBusy(true);
    const res = await postJson(`/api/payments/mock/${paymentId}`, { status, method });
    if (!res.ok) {
      toast.error(res.error);
      setBusy(false);
      return;
    }
    router.push(`/betaling/resultaat?id=${paymentId}`);
  }

  return (
    <div className="mt-8 space-y-4">
      <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-3" disabled={disabled || busy}>
        <legend className="mb-2 text-sm font-medium">Betaalmethode</legend>
        {methods.map((m) => (
          <label
            key={m.value}
            className="flex cursor-pointer items-center justify-center rounded-lg border bg-white px-3 py-2.5 text-sm font-medium has-[:checked]:border-primary has-[:checked]:bg-accent has-[:checked]:text-primary"
          >
            <input type="radio" name="method" value={m.value} checked={method === m.value} onChange={() => setMethod(m.value)} className="sr-only" />
            {m.label}
          </label>
        ))}
      </fieldset>
      <Button className="w-full" size="lg" disabled={disabled || busy} onClick={() => finish("PAID")}>
        Betaling geslaagd
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" disabled={disabled || busy} onClick={() => finish("FAILED")}>
          Mislukt
        </Button>
        <Button variant="outline" disabled={disabled || busy} onClick={() => finish("CANCELED")}>
          Annuleren
        </Button>
      </div>
      {disabled && <p className="text-center text-sm text-muted-foreground">Deze testbetaling is al afgerond.</p>}
    </div>
  );
}
