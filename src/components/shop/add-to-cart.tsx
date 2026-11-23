"use client";

import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type CartItem, useCart } from "./cart-provider";

export function AddToCartButton({
  item,
  quantity = 1,
  disabled,
  className,
}: {
  item: Omit<CartItem, "quantity">;
  quantity?: number;
  disabled?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { items, addItem } = useCart();
  const inCart = items.find((i) => i.variantId === item.variantId)?.quantity ?? 0;
  const atMax = item.maxQuantity <= 0 || inCart >= item.maxQuantity;

  function handleAdd() {
    if (atMax) {
      toast.error("Je hebt de maximale voorraad van dit artikel al in je winkelwagen.");
      return;
    }
    const allowed = Math.min(quantity, item.maxQuantity - inCart);
    addItem(item, allowed);
    const label = item.variantName && item.variantName !== "Standaard" ? `${item.name} – ${item.variantName}` : item.name;
    toast.success(`${allowed}× ${label} toegevoegd aan je winkelwagen`, {
      description: allowed < quantity ? `Er waren er nog maar ${allowed} beschikbaar.` : undefined,
      action: { label: "Bekijk winkelwagen", onClick: () => router.push("/winkelwagen") },
    });
  }

  return (
    <Button type="button" size="lg" className={cn("w-full", className)} disabled={disabled || item.maxQuantity <= 0} onClick={handleAdd}>
      <ShoppingBag className="size-5" />
      {item.maxQuantity <= 0 ? "Uitverkocht" : "In winkelwagen"}
    </Button>
  );
}
