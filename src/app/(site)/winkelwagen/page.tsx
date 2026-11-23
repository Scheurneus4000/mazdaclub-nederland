import type { Metadata } from "next";
import { auth } from "@/auth";
import { CartView } from "@/components/shop/cart-view";

export const metadata: Metadata = {
  title: "Winkelwagen",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const session = await auth();
  return (
    <section className="container-site py-10 sm:py-14">
      <p className="eyebrow">Webshop</p>
      <h1 className="heading-lg mt-3 mb-10">Winkelwagen</h1>
      <CartView isLoggedIn={!!session?.user} />
    </section>
  );
}
