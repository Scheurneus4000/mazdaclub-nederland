"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ActionState } from "@/app/admin/actions/state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";

type ButtonProps = React.ComponentProps<typeof Button>;
type ServerAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Knop die eerst een duidelijke bevestigingsvenster toont en daarna een server action uitvoert.
 * Met `requireText` moet de beheerder een woord (bijv. VERWIJDER) intypen.
 */
export function ConfirmActionDialog({
  action,
  fields,
  title,
  description,
  children,
  confirmLabel = "Verwijderen",
  requireText,
  variant = "destructive",
  size = "default",
  className,
  triggerTitle,
  disabled,
  onSuccess,
}: {
  action: ServerAction;
  fields: Record<string, string | string[]>;
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
  confirmLabel?: string;
  requireText?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  triggerTitle?: string;
  disabled?: boolean;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  const onSuccessRef = React.useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  React.useEffect(() => {
    if (!state.at) return;
    if (state.error) {
      toast.error(state.error);
      return;
    }
    if (state.message) toast.success(state.message);
    setOpen(false);
    setTyped("");
    onSuccessRef.current?.();
  }, [state]);

  const textOk = !requireText || typed.trim().toUpperCase() === requireText.toUpperCase();
  const inputId = React.useId();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setTyped("");
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant={variant} size={size} className={className} title={triggerTitle} aria-label={triggerTitle} disabled={disabled}>
          {children}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2">{description}</div>
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-5">
          {Object.entries(fields).flatMap(([name, value]) =>
            (Array.isArray(value) ? value : [value]).map((v, i) => <input key={`${name}-${i}`} type="hidden" name={name} value={v} />),
          )}
          {requireText && (
            <Field label={`Typ ${requireText} om te bevestigen`} htmlFor={inputId}>
              <Input id={inputId} name="confirmation" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoFocus />
            </Field>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annuleren
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={pending || !textOk}>
              {pending && <Loader2 className="animate-spin" />}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
