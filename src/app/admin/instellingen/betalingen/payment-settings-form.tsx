"use client";

import * as React from "react";
import { useActionState, useTransition } from "react";
import { CheckCircle2, Loader2, PlugZap, Save, XCircle } from "lucide-react";
import type { ActionState } from "@/app/admin/actions/state";
import { SecretField, type SecretState } from "@/components/admin/secret-field";
import { useFormAction } from "@/components/admin/use-form-action";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { savePaymentSettings, testPaymentConnection } from "./actions";

type Provider = "auto" | "mollie" | "stripe";

const providerOptions: Array<{ value: Provider; title: string; text: string }> = [
  { value: "mollie", title: "Mollie (aanbevolen)", text: "Nederlands, alle gewenste betaalmethoden, automatische jaarlijkse verlenging van het lidmaatschap." },
  { value: "stripe", title: "Stripe", text: "Alternatief. Geen automatische verlenging van het lidmaatschap." },
  { value: "auto", title: "Instelling van de hosting", text: "Gebruikt PAYMENT_PROVIDER en de sleutels uit de hosting (voor technische beheerders)." },
];

export function PaymentSettingsForm({
  provider,
  mollieKey,
  stripeKey,
  stripeWebhook,
  accountHolder,
  iban,
  webhookUrl,
}: {
  provider: Provider;
  mollieKey: SecretState;
  stripeKey: SecretState;
  stripeWebhook: SecretState;
  accountHolder: string;
  iban: string;
  webhookUrl: string;
}) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const { onSubmit, pending, errors } = useFormAction(savePaymentSettings);
  const [testState, testDispatch, testPending] = useActionState(testPaymentConnection, {} as ActionState);
  const [, startTransition] = useTransition();
  const [choice, setChoice] = React.useState<Provider>(provider);

  function test(target: "mollie" | "stripe") {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    data.set("target", target);
    startTransition(() => testDispatch(data));
  }

  const testResult = testState.at ? (
    <div
      role="status"
      className={cn(
        "flex gap-2 rounded-lg border px-3 py-2.5 text-sm",
        testState.error ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-900",
      )}
    >
      {testState.error ? <XCircle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
      <span>{testState.error ?? testState.message}</span>
    </div>
  ) : null;

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-6" noValidate>
      <section className="rounded-xl border border-border bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold">Betaalprovider</h2>
        <p className="mt-1 text-sm text-muted-foreground">Via deze partij betalen bezoekers online. Het geld komt automatisch op de bankrekening die je bij de provider instelt.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {providerOptions.map((o) => (
            <label
              key={o.value}
              className={cn(
                "flex cursor-pointer flex-col gap-1 rounded-xl border p-4 transition-colors",
                choice === o.value ? "border-primary bg-accent/50 ring-1 ring-primary" : "border-border hover:bg-surface",
              )}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <input type="radio" name="provider" value={o.value} checked={choice === o.value} onChange={() => setChoice(o.value)} className="accent-primary" />
                {o.title}
              </span>
              <span className="text-xs leading-relaxed text-muted-foreground">{o.text}</span>
            </label>
          ))}
        </div>
        {errors.provider && <p className="mt-2 text-xs font-medium text-destructive">{errors.provider}</p>}
      </section>

      {choice !== "stripe" && (
        <section className="space-y-4 rounded-xl border border-border bg-white p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold">Mollie koppelen</h2>
            <p className="mt-1 text-sm text-muted-foreground">Plak hier je API-sleutel uit het Mollie-dashboard. Begin met de test-sleutel (test_…) en vervang die door de live-sleutel (live_…) zodra Mollie je account heeft goedgekeurd.</p>
          </div>
          <Field label="Mollie API-sleutel" htmlFor="mollieApiKey" error={errors.mollieApiKey}>
            <SecretField name="mollieApiKey" state={mollieKey} placeholder="live_… of test_…" invalid={!!errors.mollieApiKey} />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={() => test("mollie")} disabled={testPending}>
              {testPending ? <Loader2 className="animate-spin" /> : <PlugZap />} Verbinding testen
            </Button>
            <span className="text-xs text-muted-foreground">Test eerst; opslaan doe je onderaan.</span>
          </div>
          {testResult}
        </section>
      )}

      {choice === "stripe" && (
        <section className="space-y-4 rounded-xl border border-border bg-white p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold">Stripe koppelen</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Stripe-dashboard → Developers → API keys (secret key) en Developers → Webhooks. Maak een webhook aan naar het adres hieronder met de
              gebeurtenissen <code>checkout.session.*</code> en <code>charge.refunded</code>.
            </p>
          </div>
          <Field label="Secret key" htmlFor="stripeSecretKey" error={errors.stripeSecretKey}>
            <SecretField name="stripeSecretKey" state={stripeKey} placeholder="sk_live_… of sk_test_…" invalid={!!errors.stripeSecretKey} />
          </Field>
          <Field label="Webhookgeheim (signing secret)" htmlFor="stripeWebhookSecret" error={errors.stripeWebhookSecret}>
            <SecretField name="stripeWebhookSecret" state={stripeWebhook} placeholder="whsec_…" invalid={!!errors.stripeWebhookSecret} />
          </Field>
          <div>
            <p className="text-xs font-medium">Webhook-adres</p>
            <code className="mt-1 block break-all rounded-md bg-surface px-3 py-2 text-xs">{webhookUrl}</code>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={() => test("stripe")} disabled={testPending}>
              {testPending ? <Loader2 className="animate-spin" /> : <PlugZap />} Verbinding testen
            </Button>
          </div>
          {testResult}
        </section>
      )}

      <section className="space-y-4 rounded-xl border border-border bg-white p-5 sm:p-6">
        <div>
          <h2 className="text-base font-semibold">Bankrekening van de vereniging</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Online betalingen worden door {choice === "stripe" ? "Stripe" : "Mollie"} automatisch uitbetaald op de rekening die je in hun dashboard instelt; die
            stel je dus daar in. De gegevens hieronder gebruikt de website voor handmatige overboekingen, bijvoorbeeld in een betaallink-mail
            (&quot;Liever zelf overmaken?&quot;). Optioneel.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tenaamstelling" htmlFor="accountHolder" error={errors.accountHolder}>
            <Input id="accountHolder" name="accountHolder" defaultValue={accountHolder} placeholder="Bijv. MazdaClub Nederland" aria-invalid={!!errors.accountHolder} />
          </Field>
          <Field label="IBAN" htmlFor="iban" error={errors.iban}>
            <Input id="iban" name="iban" defaultValue={iban} placeholder="NL00 BANK 0123 4567 89" className="font-mono uppercase" autoComplete="off" aria-invalid={!!errors.iban} />
          </Field>
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-4 rounded-xl border border-border bg-white/95 p-4 shadow-lg backdrop-blur">
        <p className="text-sm text-muted-foreground">Sleutels worden versleuteld opgeslagen en nooit meer getoond.</p>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Betaalinstellingen opslaan
        </Button>
      </div>
    </form>
  );
}
