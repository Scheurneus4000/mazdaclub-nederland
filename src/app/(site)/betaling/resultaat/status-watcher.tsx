"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { PaymentStatus, PaymentType } from "@prisma/client";
import { useCart } from "@/components/shop/cart-provider";

/** Ververst de pagina zolang de betaling openstaat en leegt de winkelwagen na een geslaagde bestelling. */
export function PaymentStatusWatcher({ paymentId, initialStatus, type }: { paymentId: string; initialStatus: PaymentStatus; type: PaymentType }) {
  const router = useRouter();
  const { clear, ready } = useCart();

  React.useEffect(() => {
    if (ready && type === "ORDER" && initialStatus === "PAID") clear();
  }, [ready, type, initialStatus, clear]);

  React.useEffect(() => {
    if (initialStatus !== "OPEN" && initialStatus !== "PENDING") return;
    let attempts = 0;
    const timer = window.setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/payments/${paymentId}`, { cache: "no-store" });
        const data = (await res.json()) as { status?: PaymentStatus };
        if (data.status && data.status !== initialStatus) {
          window.clearInterval(timer);
          router.refresh();
        }
      } catch {
        /* volgende poging */
      }
      if (attempts > 40) window.clearInterval(timer);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [paymentId, initialStatus, router]);

  return null;
}
