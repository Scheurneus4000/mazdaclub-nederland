"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="container-site flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <p className="eyebrow">Storing</p>
      <h1 className="heading-md mt-4">Er ging iets mis</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        We konden deze pagina niet laden. Probeer het opnieuw; blijft het probleem bestaan, neem dan contact met ons op.
      </p>
      {error.digest && <p className="mt-2 text-xs text-muted-foreground">Foutcode: {error.digest}</p>}
      <Button className="mt-8" onClick={reset}>
        Opnieuw proberen
      </Button>
    </main>
  );
}
