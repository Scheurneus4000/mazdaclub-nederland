"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  size = "default",
  label = "Aantal",
  className,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  size?: "default" | "sm";
  label?: string;
  className?: string;
}) {
  const btn = cn(
    "flex items-center justify-center text-foreground/70 transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer",
    size === "sm" ? "size-8" : "size-11",
  );
  return (
    <div className={cn("inline-flex items-center overflow-hidden rounded-md border border-input bg-background", className)} role="group" aria-label={label}>
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Minder">
        <Minus className="size-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        aria-label={label}
        onChange={(e) => {
          const n = Number.parseInt(e.target.value, 10);
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
        className={cn(
          "border-x border-input bg-transparent text-center text-sm font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          size === "sm" ? "h-8 w-10" : "h-11 w-14",
        )}
      />
      <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Meer">
        <Plus className="size-4" />
      </button>
    </div>
  );
}
