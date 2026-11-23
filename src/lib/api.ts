import { NextResponse } from "next/server";
import type { z } from "zod";
import { fieldErrors } from "@/lib/validation";

/** Uniforme JSON-antwoorden voor API-routes. */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(error: string, status = 400, fields?: Record<string, string>) {
  return NextResponse.json({ error, fields }, { status });
}

export function validationFailed(error: z.ZodError) {
  return fail("Controleer de gemarkeerde velden.", 422, fieldErrors(error));
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

/** Standaard antwoordtype dat client-formulieren verwachten. */
export type ApiError = { error: string; fields?: Record<string, string> };
