import { NextResponse } from "next/server";
import { handleProviderWebhook } from "@/lib/payments";

/**
 * Mollie-webhook. Mollie stuurt alleen `id=tr_xxx` (form-encoded); de echte status halen we
 * zelf op via de API, dus de inhoud van het verzoek hoeft niet vertrouwd te worden.
 * Een 200-antwoord betekent "ontvangen"; bij een fout (5xx) probeert Mollie het later opnieuw.
 */
export async function POST(req: Request) {
  let id: string | null = null;
  try {
    const form = await req.formData();
    id = (form.get("id") as string | null) ?? null;
  } catch {
    id = null;
  }
  if (!id || !/^tr_[A-Za-z0-9]+$/.test(id)) {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }

  try {
    await handleProviderWebhook("MOLLIE", id);
    return new NextResponse("OK", { status: 200 });
  } catch (err) {
    console.error("[webhook mollie]", err);
    return new NextResponse("Fout bij verwerken", { status: 500 });
  }
}
