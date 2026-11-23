/** Gedeeld resultaattype voor beheer-server-actions (gebruikt met useActionState). */
export type ActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fields?: Record<string, string>;
  /** Telt op bij elke uitvoering, zodat dezelfde melding opnieuw getoond kan worden. */
  at?: number;
};

export const initialActionState: ActionState = {};

export function success(message: string): ActionState {
  return { ok: true, message, at: Date.now() };
}

export function failure(error: string, fields?: Record<string, string>): ActionState {
  return { ok: false, error, fields, at: Date.now() };
}
