"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ActionState } from "@/app/admin/actions/state";
import { Button } from "@/components/ui/button";

type ButtonProps = React.ComponentProps<typeof Button>;
type ServerAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Knop die een server action uitvoert met verborgen velden, optionele bevestiging
 * (window.confirm) en een toast met het resultaat.
 */
export function ActionButton({
  action,
  fields,
  children,
  confirm,
  variant = "outline",
  size = "sm",
  className,
  title,
}: {
  action: ServerAction;
  fields: Record<string, string>;
  children: React.ReactNode;
  confirm?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  title?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);

  React.useEffect(() => {
    if (!state.at) return;
    if (state.error) toast.error(state.error);
    else if (state.message) toast.success(state.message);
  }, [state]);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="inline-flex"
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button type="submit" variant={variant} size={size} className={className} disabled={pending} title={title}>
        {pending && <Loader2 className="animate-spin" />}
        {children}
      </Button>
    </form>
  );
}

/** Verzendknop met bevestigingsvraag, voor gewone formulieren. */
export function ConfirmSubmitButton({ confirm, children, ...props }: ButtonProps & { confirm: string }) {
  return (
    <Button
      type="submit"
      {...props}
      onClick={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
        props.onClick?.(e);
      }}
    >
      {children}
    </Button>
  );
}

/** Toont het resultaat van een useActionState-formulier als toast. */
export function useActionToast(state: ActionState) {
  React.useEffect(() => {
    if (!state.at) return;
    if (state.error) toast.error(state.error);
    else if (state.message) toast.success(state.message);
  }, [state]);
}
