import type { Metadata, Viewport } from "next";
import { Barlow, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { CookieBanner } from "@/components/layout/cookie-banner";
import { Navbar } from "@/components/layout/navbar";
import { PricingProvider } from "@/components/pricing-provider";
import { CartProvider } from "@/components/shop/cart-provider";
import { getContent } from "@/lib/content";
import { getPricing } from "@/lib/settings";
import { siteConfig } from "@/lib/site";
import { siteUrl } from "@/lib/utils";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const barlow = Barlow({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-barlow", display: "swap" });

/** Metadata met favicon en deelafbeelding uit het beheer (Teksten & afbeeldingen → Logo). */
export async function generateMetadata(): Promise<Metadata> {
  const c = await getContent();
  const shareImage = c.shareImageUrl || "/og";
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `${siteConfig.name} – de landelijke Mazda-vereniging`, template: `%s | ${siteConfig.name}` },
    description: siteConfig.description,
    keywords: [...siteConfig.keywords],
    applicationName: siteConfig.name,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      siteName: siteConfig.name,
      title: siteConfig.name,
      description: siteConfig.description,
      images: [{ url: shareImage, width: 1200, height: 630, alt: `${siteConfig.name} – de landelijke Mazda-vereniging` }],
    },
    twitter: { card: "summary_large_image", title: siteConfig.name, description: siteConfig.description, images: [shareImage] },
    robots: { index: true, follow: true },
    icons: c.faviconUrl ? { icon: c.faviconUrl, apple: c.faviconUrl } : { icon: "/icon.svg" },
  };
}

export const viewport: Viewport = {
  themeColor: "#C00000",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [c, pricing] = await Promise.all([getContent(), getPricing()]);
  const absolute = (u: string) => (u.startsWith("http") ? u : siteUrl(u));
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name: siteConfig.name,
    url: siteUrl(),
    logo: absolute(c.logoUrl || "/icon.svg"),
    description: siteConfig.description,
    foundingDate: c.statFounded || undefined,
    email: c.contactEmail || undefined,
    sameAs: [c.instagramUrl, c.facebookUrl, c.youtubeUrl, c.tiktokUrl].filter(Boolean),
    sport: "Motorsport",
    areaServed: "NL",
  };

  return (
    <html lang="nl" className={`${inter.variable} ${barlow.variable}`}>
      <body className="min-h-dvh font-sans">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white">
          Naar de inhoud
        </a>
        <PricingProvider value={pricing}>
        <CartProvider>
          <Navbar />
          {children}
          <CookieBanner />
        </CartProvider>
        </PricingProvider>
        <Toaster position="top-center" richColors closeButton />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      </body>
    </html>
  );
}
