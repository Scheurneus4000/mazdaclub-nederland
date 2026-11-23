import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/footer";

export default function NotFound() {
  return (
    <>
      <main id="main" className="container-site flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
        <p className="font-display text-8xl font-extrabold text-primary">404</p>
        <h1 className="heading-md mt-4">Deze afslag bestaat niet</h1>
        <p className="mt-3 max-w-md text-muted-foreground">De pagina die je zoekt is verplaatst of bestaat niet meer. Rij terug naar de homepagina of bekijk de komende evenementen.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/">Naar home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/evenementen">Bekijk evenementen</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </>
  );
}
