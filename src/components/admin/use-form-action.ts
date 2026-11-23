"use client";

import * as React from "react";
import { useActionState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/app/admin/actions/state";

type ServerAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Formulier + server action zónder automatische reset van React 19 (die zou bij een
 * validatiefout alle invoer wissen). Toont het resultaat als toast.
 */
export function useFormAction(action: ServerAction, opts: { toastSuccess?: boolean } = {}) {
  const [state, dispatch, actionPending] = useActionState(action, {} as ActionState);
  const [transitionPending, startTransition] = useTransition();
  const { toastSuccess = true } = opts;

  React.useEffect(() => {
    if (!state.at) return;
    if (state.error) toast.error(state.error);
    else if (state.message && toastSuccess) toast.success(state.message);
  }, [state, toastSuccess]);

  const onSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      startTransition(() => dispatch(formData));
    },
    [dispatch],
  );

  return { state, onSubmit, pending: actionPending || transitionPending, errors: state.fields ?? {} };
}
