"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import { updateOrderNotes, updateOrderStatus } from "@/app/admin/actions/orders";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFormAction } from "./use-form-action";

const labels: Record<OrderStatus, string> = {
  PENDING: "Wacht op betaling",
  PAID: "Betaald",
  PROCESSING: "In behandeling",
  SHIPPED: "Verzonden",
  COMPLETED: "Afgerond",
  CANCELLED: "Geannuleerd",
  REFUNDED: "Terugbetaald",
};

export function OrderStatusForm({ orderId, status, trackingCode, pickup }: { orderId: string; status: OrderStatus; trackingCode: string | null; pickup: boolean }) {
  const { onSubmit, pending } = useFormAction(updateOrderStatus);
  const [next, setNext] = React.useState<OrderStatus>(status);
  const locked = status === "CANCELLED";

  return (
    <form
      onSubmit={(e) => {
        if (next === "CANCELLED" && status !== "CANCELLED" && !window.confirm("Bestelling annuleren? Gereserveerde voorraad wordt teruggeboekt.")) {
          e.preventDefault();
          return;
        }
        onSubmit(e);
      }}
      className="space-y-4"
    >
      <input type="hidden" name="id" value={orderId} />
      <Field label="Status" htmlFor="status">
        <NativeSelect id="status" name="status" value={next} onChange={(e) => setNext(e.target.value as OrderStatus)} disabled={locked}>
          {(Object.keys(labels) as OrderStatus[]).map((s) => (
            <option key={s} value={s}>
              {labels[s]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      {!pickup && (
        <Field label="Track & trace-code" htmlFor="trackingCode" hint="Wordt meegestuurd in de verzendmail.">
          <Input id="trackingCode" name="trackingCode" defaultValue={trackingCode ?? ""} placeholder="3SABCD123456789" disabled={locked} />
        </Field>
      )}
      {next === "SHIPPED" && status !== "SHIPPED" && <p className="rounded-md bg-sky-50 px-3 py-2 text-xs text-sky-900">De klant ontvangt automatisch een verzendmelding.</p>}
      <Button type="submit" className="w-full" disabled={pending || locked}>
        {pending && <Loader2 className="animate-spin" />}
        Opslaan
      </Button>
      {locked && <p className="text-xs text-muted-foreground">Geannuleerde bestellingen kunnen niet meer worden gewijzigd.</p>}
    </form>
  );
}

export function OrderNotesForm({ orderId, notes }: { orderId: string; notes: string | null }) {
  const { onSubmit, pending } = useFormAction(updateOrderNotes);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="id" value={orderId} />
      <Textarea name="notes" defaultValue={notes ?? ""} rows={4} placeholder="Interne notitie of opmerking van de klant" aria-label="Notitie" />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        Notitie opslaan
      </Button>
    </form>
  );
}
