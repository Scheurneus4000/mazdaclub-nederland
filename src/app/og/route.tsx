import { ImageResponse } from "next/og";

/**
 * Standaard deelafbeelding voor social media (Open Graph), 1200×630, met het witte clublogo.
 * Wordt gebruikt zolang er in Beheer → Teksten & afbeeldingen → Logo geen eigen deelafbeelding is geüpload.
 */
export async function GET(req: Request) {
  // Het logo staat in /public; via de eigen URL ophalen werkt zowel lokaal als op Vercel.
  let logo: string | null = null;
  try {
    const res = await fetch(new URL("/images/logo/mazdaclub-nederland-wit.png", req.url));
    if (res.ok) logo = `data:image/png;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    logo = null;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0b0b0c 0%, #1c1c1f 60%, #3a0000 100%)",
          color: "white",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="MazdaClub Nederland" width={480} height={130} style={{ objectFit: "contain" }} />
        ) : (
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase" }}>MazdaClub Nederland</div>
        )}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1, textTransform: "uppercase", letterSpacing: -1 }}>Rijden met passie.</div>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, textTransform: "uppercase", color: "#ff3b3b" }}>Samen met de club.</div>
          <div style={{ marginTop: 28, fontSize: 28, color: "rgba(255,255,255,0.7)" }}>Toerritten · Mazda Meetings · Webshop · Ledenvoordelen</div>
        </div>
        <div style={{ height: 8, width: "100%", background: "#C00000", borderRadius: 4 }} />
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
