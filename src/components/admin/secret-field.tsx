"use client";

import * as React from "react";
import { Eye, EyeOff, KeyRound, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Moet gelijk zijn aan CLEAR_SECRET in src/lib/settings.ts. */
const CLEAR = "__wissen__";

export type SecretState = { set: boolean; masked: string | null; unreadable?: boolean; source?: "beheer" | "hosting" | null };

/**
 * Invoerveld voor een geheime waarde (API-sleutel, wachtwoord). De opgeslagen waarde wordt nooit
 * naar de browser gestuurd: je ziet alleen een gemaskeerde versie. Leeg laten = niet wijzigen.
 */
export function SecretField({
  name,
  id,
  state,
  placeholder,
  invalid,
  allowClear = true,
}: {
  name: string;
  id?: string;
  state: SecretState;
  placeholder?: string;
  invalid?: boolean;
  allowClear?: boolean;
}) {
  const [value, setValue] = React.useState("");
  const [cleared, setCleared] = React.useState(false);
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="space-y-2">
      {state.set && !cleared && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <KeyRound className="size-4 shrink-0 text-emerald-600" />
          <span className="font-mono text-xs">{state.unreadable ? "Opgeslagen (niet meer leesbaar – vul opnieuw in)" : (state.masked ?? "Opgeslagen")}</span>
          <span className="text-xs text-emerald-700">· veilig versleuteld opgeslagen</span>
        </div>
      )}
      {!state.set && state.source === "hosting" && (
        <p className="rounded-md bg-surface px-3 py-2 text-xs text-muted-foreground">Er wordt nu een waarde uit de hosting gebruikt. Vul hier een waarde in om die te vervangen.</p>
      )}
      {cleared ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <input type="hidden" name={name} value={CLEAR} />
          Wordt verwijderd bij opslaan.
          <Button type="button" size="sm" variant="ghost" className="h-7" onClick={() => setCleared(false)}>
            <Undo2 /> Ongedaan maken
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id={id ?? name}
              name={name}
              type={visible ? "text" : "password"}
              autoComplete="new-password"
              spellCheck={false}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={state.set ? "Laat leeg om niet te wijzigen" : (placeholder ?? "Plak hier de waarde")}
              aria-invalid={invalid}
              className={cn("pr-10 font-mono text-sm")}
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-muted-foreground hover:text-foreground"
              aria-label={visible ? "Verbergen" : "Tonen"}
            >
              {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {state.set && allowClear && (
            <Button type="button" variant="outline" onClick={() => setCleared(true)} title="Verwijderen">
              <Trash2 />
              <span className="sr-only sm:not-sr-only">Verwijderen</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
