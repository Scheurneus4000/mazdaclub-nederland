"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Field } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { safeCallbackUrl } from "./safe-callback";

export function LoginForm({ callbackUrl, notice }: { callbackUrl?: string; notice?: string }) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Vul je e-mailadres en wachtwoord in.");
      return;
    }
    setBusy(true);
    try {
      const res = await signIn("credentials", { email: email.trim().toLowerCase(), password, redirect: false });
      if (!res || res.error) {
        setError("E-mailadres of wachtwoord onjuist.");
        setBusy(false);
        return;
      }
      router.push(safeCallbackUrl(callbackUrl));
      router.refresh();
    } catch {
      setError("Inloggen is op dit moment niet mogelijk. Probeer het later opnieuw.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {notice && <Alert variant="success">{notice}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      <Field label="E-mailadres" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="naam@voorbeeld.nl"
          required
        />
      </Field>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium">
            Wachtwoord<span className="ml-0.5 text-primary">*</span>
          </label>
          <Link href="/wachtwoord-vergeten" className="text-xs font-semibold text-primary hover:underline">
            Wachtwoord vergeten?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-11"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <LogIn />} Inloggen
      </Button>
    </form>
  );
}
