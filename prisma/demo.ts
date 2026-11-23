/**
 * DEMODATA – alleen om lokaal te testen, nooit op de echte website.
 * Vult de database met fictieve producten, evenementen, albums, leden, bestellingen en betalingen,
 * zodat je alle schermen met inhoud kunt bekijken.
 *
 *   npm run db:demo        (terug naar een schone start: npm run db:fresh)
 *
 * LET OP: wist alle bestaande data. Weigert daarom altijd in productie.
 *
 * Testaccounts (alleen voor ontwikkeling – wijzig of verwijder vóór livegang):
 *   Beheerder: admin@mazdaclub.nl
 *   Lid:       sanne.devries@example.com
 *   Wachtwoord voor alle testaccounts: SEED_PASSWORD of standaard "MazdaClub2026!"
 */
import { PrismaClient, type MembershipStatus, type OrderStatus, type ShippingMethod } from "@prisma/client";
import bcrypt from "bcryptjs";
import { photoPool, unsplash } from "../src/lib/images";

const prisma = new PrismaClient();
const PASSWORD = process.env.SEED_PASSWORD || "MazdaClub2026!";
const DAY = 86_400_000;

function at(daysFromNow: number, hour: number, minute = 0): Date {
  const d = new Date(Date.now() + daysFromNow * DAY);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function addYears(d: Date, n: number) {
  const x = new Date(d);
  x.setFullYear(x.getFullYear() + n);
  return x;
}

async function wipe() {
  await prisma.newsPost.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.eventRegistration.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.album.deleteMany();
  await prisma.event.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.contactMessage.deleteMany();
  await prisma.partnerOffer.deleteMany();
  await prisma.siteContent.deleteMany();
  await prisma.appSetting.deleteMany();
  await prisma.adminNotification.deleteMany();
}

// ─── Webshop ────────────────────────────────────────────────────────────────

const categories = [
  { slug: "kentekenplaathouders", name: "Kentekenplaathouders", description: "Strakke kentekenplaathouders met MazdaClub-belettering." },
  { slug: "stickers", name: "Stickers", description: "Weerbestendige vinyl stickers voor auto, laptop en gereedschapskist." },
  { slug: "drinkbekers", name: "Drinkbekers", description: "Mokken en thermosbekers voor onderweg en in de garage." },
  { slug: "sleutelhangers", name: "Sleutelhangers", description: "Sleutelhangers van leer en metaal." },
  { slug: "kleding", name: "Kleding", description: "Clubkleding van hoogwaardige kwaliteit, geborduurd en bedrukt." },
  { slug: "accessoires", name: "Overige accessoires", description: "Poetsdoeken, lanyards, ventieldopjes en meer." },
];

type SeedVariant = { name: string; sku: string; stock: number; price?: number; attributes?: Record<string, string> };
type SeedProduct = {
  slug: string;
  name: string;
  category: string;
  basePrice: number;
  images: string[];
  featured?: boolean;
  description: string;
  variants: SeedVariant[];
};

const sizes = ["S", "M", "L", "XL", "XXL"];
const sizeVariants = (prefix: string, color: string, colorCode: string, stockBySize: number[]): SeedVariant[] =>
  sizes.map((s, i) => ({ name: `${color} / ${s}`, sku: `${prefix}-${colorCode}-${s}`, stock: stockBySize[i] ?? 0, attributes: { kleur: color, maat: s } }));

const products: SeedProduct[] = [
  {
    slug: "kentekenplaathouder-zwart",
    name: "Kentekenplaathouder Zwart (set van 2)",
    category: "kentekenplaathouders",
    basePrice: 1995,
    images: ["/images/products/kentekenplaathouder-zwart.svg"],
    featured: true,
    description:
      "Mat zwarte kentekenplaathouders met verhoogde 'MazdaClub Nederland'-belettering. Geschikt voor Nederlandse en Belgische kentekenplaten (520 × 110 mm).\n\nInclusief RVS-bevestigingsschroeven en afdekdopjes. UV- en weerbestendig.",
    variants: [{ name: "Set van 2", sku: "MCN-KPH-ZW", stock: 42 }],
  },
  {
    slug: "kentekenplaathouder-rvs-chroom",
    name: "Kentekenplaathouder RVS Chroom (set van 2)",
    category: "kentekenplaathouders",
    basePrice: 2995,
    images: ["/images/products/kentekenplaathouder-chroom.svg"],
    description: "Gepolijst RVS met gegraveerde belettering. Roestvrij en een premium afwerking voor je Mazda.\n\nGeschikt voor standaard EU-kentekenplaten.",
    variants: [{ name: "Set van 2", sku: "MCN-KPH-RVS", stock: 18 }],
  },
  {
    slug: "clublogo-sticker-rond",
    name: "Clublogo sticker rond",
    category: "stickers",
    basePrice: 350,
    images: ["/images/products/sticker-logo.svg"],
    featured: true,
    description: "Het iconische clublogo als ronde vinyl sticker. Wasstraatbestendig, 5 jaar UV-bestendig en restloos verwijderbaar.",
    variants: [
      { name: "Ø 8 cm", sku: "MCN-STK-R8", stock: 150, attributes: { formaat: "8 cm" } },
      { name: "Ø 12 cm", sku: "MCN-STK-R12", stock: 120, price: 450, attributes: { formaat: "12 cm" } },
      { name: "Ø 20 cm", sku: "MCN-STK-R20", stock: 60, price: 695, attributes: { formaat: "20 cm" } },
    ],
  },
  {
    slug: "stickerset-jinba-ittai",
    name: "Stickerset 'Jinba Ittai' (5 stuks)",
    category: "stickers",
    basePrice: 795,
    images: ["/images/products/stickerset-jinba-ittai.svg"],
    description: "Vijf stickers in één set: clublogo, 'Jinba Ittai', rotor-silhouet, 'Zoom-Zoom' en een Nederlandse vlag-strip.",
    variants: [{ name: "Set van 5", sku: "MCN-STK-SET5", stock: 80 }],
  },
  {
    slug: "raamsticker-mazdaclub",
    name: "Raamsticker MazdaClub Nederland",
    category: "stickers",
    basePrice: 595,
    images: ["/images/products/raamsticker.svg"],
    description: "Uitgesneden belettering voor de achterruit (40 × 6 cm), zonder achtergrond. Inclusief applicatietape.",
    variants: [
      { name: "Wit", sku: "MCN-RST-WIT", stock: 70, attributes: { kleur: "Wit" } },
      { name: "Rood", sku: "MCN-RST-ROOD", stock: 45, attributes: { kleur: "Rood" } },
    ],
  },
  {
    slug: "koffiemok-mazdaclub",
    name: "Koffiemok MazdaClub",
    category: "drinkbekers",
    basePrice: 1295,
    images: ["/images/products/koffiemok.svg"],
    description: "Keramische mok van 330 ml met rondom bedrukt clublogo. Vaatwasser- en magnetronbestendig.",
    variants: [{ name: "330 ml", sku: "MCN-MOK-330", stock: 36 }],
  },
  {
    slug: "thermosbeker-rvs",
    name: "Thermosbeker RVS 450 ml",
    category: "drinkbekers",
    basePrice: 2195,
    images: ["/images/products/thermosbeker.svg"],
    featured: true,
    description: "Dubbelwandige RVS-beker die koffie 6 uur warm en water 12 uur koud houdt. Lekvrije schuifdeksel, past in de bekerhouder.",
    variants: [
      { name: "Zwart", sku: "MCN-THB-ZW", stock: 24, attributes: { kleur: "Zwart" } },
      { name: "Soul Red", sku: "MCN-THB-RD", stock: 4, attributes: { kleur: "Soul Red" } },
    ],
  },
  {
    slug: "lederen-sleutelhanger",
    name: "Lederen sleutelhanger",
    category: "sleutelhangers",
    basePrice: 995,
    images: ["/images/products/sleutelhanger-leer.svg"],
    description: "Echt leer met rood contraststiksel en geslagen clublogo. Met stevige RVS-ring.",
    variants: [{ name: "Zwart leer", sku: "MCN-SLH-LEER", stock: 55 }],
  },
  {
    slug: "metalen-sleutelhanger-rotor",
    name: "Metalen sleutelhanger 'Rotor'",
    category: "sleutelhangers",
    basePrice: 1195,
    images: ["/images/products/sleutelhanger-rotor.svg"],
    description: "Een eerbetoon aan de wankelmotor: massief metalen sleutelhanger in de vorm van een rotor, met gegraveerd logo.",
    variants: [{ name: "Gunmetal", sku: "MCN-SLH-ROTOR", stock: 0 }],
  },
  {
    slug: "t-shirt-mazdaclub",
    name: "T-shirt MazdaClub",
    category: "kleding",
    basePrice: 2495,
    images: ["/images/products/tshirt-zwart.svg", "/images/products/tshirt-wit.svg"],
    featured: true,
    description: "Zacht T-shirt van 100% biologisch katoen (180 g/m²) met borstlogo en grote rugprint. Normale pasvorm.\n\nWassen op 30 °C, binnenstebuiten.",
    variants: [...sizeVariants("MCN-TSH", "Zwart", "ZW", [8, 14, 18, 12, 6]), ...sizeVariants("MCN-TSH", "Wit", "WT", [5, 9, 11, 7, 3])],
  },
  {
    slug: "hoodie-mazdaclub",
    name: "Hoodie MazdaClub",
    category: "kleding",
    basePrice: 4995,
    images: ["/images/products/hoodie.svg"],
    description: "Warme hoodie (320 g/m²) met geborduurd logo op de borst en 'Jinba Ittai' op de mouw. Kangoeroezak en dubbele capuchon.",
    variants: [...sizeVariants("MCN-HOD", "Zwart", "ZW", [4, 9, 10, 8, 3]), ...sizeVariants("MCN-HOD", "Antraciet", "AN", [2, 5, 6, 4, 0])],
  },
  {
    slug: "pet-mazdaclub",
    name: "Pet MazdaClub",
    category: "kleding",
    basePrice: 1995,
    images: ["/images/products/pet.svg"],
    description: "Six-panel cap met 3D-geborduurd logo en verstelbare metalen sluiting. One size.",
    variants: [
      { name: "Zwart", sku: "MCN-PET-ZW", stock: 30, attributes: { kleur: "Zwart" } },
      { name: "Rood", sku: "MCN-PET-RD", stock: 12, attributes: { kleur: "Rood" } },
    ],
  },
  {
    slug: "softshell-jas",
    name: "Softshell jas MazdaClub",
    category: "kleding",
    basePrice: 7995,
    images: ["/images/products/softshell-jas.svg"],
    description: "Wind- en waterafstotende softshell met fleece binnenkant. Perfect voor vroege toerritten en avondmeetings. Geborduurd logo op borst en rug.",
    variants: sizeVariants("MCN-SSJ", "Zwart", "ZW", [3, 6, 7, 5, 2]),
  },
  {
    slug: "microvezel-poetsdoeken",
    name: "Microvezel poetsdoeken (set van 3)",
    category: "accessoires",
    basePrice: 1495,
    images: ["/images/products/poetsdoeken.svg"],
    description: "Drie premium microvezeldoeken (40 × 40 cm, 500 g/m²) zonder randen: krasvrij voor lak, glas en interieur.",
    variants: [{ name: "Set van 3", sku: "MCN-PTS-3", stock: 64 }],
  },
  {
    slug: "lanyard-mazdaclub",
    name: "Lanyard MazdaClub",
    category: "accessoires",
    basePrice: 495,
    images: ["/images/products/lanyard.svg"],
    description: "Rode lanyard met herhalend wit logo en afneembare sleutelclip. Ideaal voor je clubpas tijdens evenementen.",
    variants: [{ name: "Rood", sku: "MCN-LAN-RD", stock: 90 }],
  },
  {
    slug: "ventieldopjes-set",
    name: "Ventieldopjes set (4 stuks)",
    category: "accessoires",
    basePrice: 895,
    images: ["/images/products/ventieldopjes.svg"],
    description: "Geanodiseerd aluminium ventieldopjes met gegraveerd logo. Set van vier.",
    variants: [
      { name: "Rood", sku: "MCN-VTD-RD", stock: 28, attributes: { kleur: "Rood" } },
      { name: "Zwart", sku: "MCN-VTD-ZW", stock: 3, attributes: { kleur: "Zwart" } },
    ],
  },
];

// ─── Leden ──────────────────────────────────────────────────────────────────

type SeedMember = {
  firstName: string;
  lastName: string;
  email: string;
  city: string;
  plate: string;
  car: string;
  membership?: { status: MembershipStatus; startedDaysAgo: number; periodStartDaysAgo?: number; subscription?: boolean };
  admin?: boolean;
};

const members: SeedMember[] = [
  { firstName: "Bestuur", lastName: "MazdaClub", email: "admin@mazdaclub.nl", city: "Utrecht", plate: "MX-555-C", car: "Mazda MX-5 ND RF", admin: true, membership: { status: "ACTIVE", startedDaysAgo: 2400, periodStartDaysAgo: 120, subscription: true } },
  { firstName: "Sanne", lastName: "de Vries", email: "sanne.devries@example.com", city: "Amersfoort", plate: "XK-123-B", car: "Mazda MX-5 NA", membership: { status: "ACTIVE", startedDaysAgo: 900, periodStartDaysAgo: 60, subscription: true } },
  { firstName: "Daan", lastName: "Janssen", email: "daan.janssen@example.com", city: "Eindhoven", plate: "R-711-JX", car: "Mazda RX-7 FD", membership: { status: "ACTIVE", startedDaysAgo: 1500, periodStartDaysAgo: 340 } },
  { firstName: "Lotte", lastName: "Bakker", email: "lotte.bakker@example.com", city: "Zwolle", plate: "SV-904-L", car: "Mazda 3 Hatchback", membership: { status: "ACTIVE", startedDaysAgo: 200, periodStartDaysAgo: 200, subscription: true } },
  { firstName: "Bram", lastName: "Visser", email: "bram.visser@example.com", city: "Haarlem", plate: "GZ-482-T", car: "Mazda CX-60", membership: { status: "ACTIVE", startedDaysAgo: 45, periodStartDaysAgo: 45, subscription: true } },
  { firstName: "Fleur", lastName: "Smit", email: "fleur.smit@example.com", city: "Groningen", plate: "TN-27-PK", car: "Mazda MX-5 NB", membership: { status: "ACTIVE", startedDaysAgo: 700, periodStartDaysAgo: 350 } },
  { firstName: "Thijs", lastName: "Meijer", email: "thijs.meijer@example.com", city: "Breda", plate: "KL-338-V", car: "Mazda RX-8", membership: { status: "EXPIRED", startedDaysAgo: 800, periodStartDaysAgo: 420 } },
  { firstName: "Noor", lastName: "de Boer", email: "noor.deboer@example.com", city: "Rotterdam", plate: "HB-615-D", car: "Mazda 6 Wagon", membership: { status: "ACTIVE", startedDaysAgo: 20, periodStartDaysAgo: 20, subscription: true } },
  { firstName: "Ruben", lastName: "Mulder", email: "ruben.mulder@example.com", city: "Nijmegen", plate: "ZP-71-RF", car: "Mazda MX-5 NC", membership: { status: "PENDING", startedDaysAgo: 0 } },
  { firstName: "Eva", lastName: "Hendriks", email: "eva.hendriks@example.com", city: "Leiden", plate: "VJ-250-N", car: "Mazda 2" },
  { firstName: "Jesse", lastName: "Dekker", email: "jesse.dekker@example.com", city: "Arnhem", plate: "NF-830-S", car: "Mazda CX-5" },
  { firstName: "Mila", lastName: "van Dijk", email: "mila.vandijk@example.com", city: "Maastricht", plate: "PL-19-XD", car: "Mazda MX-30", membership: { status: "ACTIVE", startedDaysAgo: 1100, periodStartDaysAgo: 5 } },
];

// ─── Evenementen ────────────────────────────────────────────────────────────

const upcomingEvents = [
  {
    slug: "toerrit-veluwe",
    title: "Toerrit over de Veluwe",
    summary: "Een prachtige toerrit van 180 km over de mooiste bochtige wegen van de Veluwe, met lunch halverwege.",
    location: "Restaurant De Zwaluwhoeve",
    address: "Zwaluwenweg 21",
    city: "Hierden",
    days: 12,
    hour: 9,
    capacity: 60,
    image: photoPool.mx5Autumn,
  },
  {
    slug: "maandelijkse-mazda-meeting",
    title: "Maandelijkse Mazda Meeting",
    summary: "Informeel bijpraten, auto's bekijken en ervaringen delen met andere Mazda-liefhebbers. Iedereen is welkom.",
    location: "Carpoolplaats Harmelen",
    address: "Carpoolplaats A12",
    city: "Harmelen",
    days: 26,
    hour: 19,
    capacity: 80,
    image: photoPool.rx7BlueWet,
  },
  {
    slug: "ardennen-toerrit",
    title: "Ardennen Toerrit",
    summary: "Een dag lang genieten van haarspeldbochten, uitzichten en Belgische frieten. Route van 240 km door de Ardennen.",
    location: "Parking Hoge Venen",
    address: "Route de Botrange 131",
    city: "Waimes (BE)",
    days: 40,
    hour: 8,
    capacity: 50,
    image: photoPool.mountainsNight,
  },
  {
    slug: "landelijke-clubdag-2026",
    title: "Landelijke Clubdag & Treffen",
    summary: "Hét jaarlijkse treffen: honderden Mazda's, show & shine-wedstrijd, clubstand met webshopartikelen en een ALV.",
    location: "Evenemententerrein De Bilt",
    address: "Utrechtseweg 300",
    city: "De Bilt",
    days: 61,
    hour: 10,
    capacity: 250,
    image: photoPool.rx7WhiteMeet,
  },
  {
    slug: "avondrit-hollandse-kust",
    title: "Avondrit langs de Hollandse kust",
    summary: "Ontspannen avondrit van 110 km door de duinen, met een hapje op het strand van Noordwijk als afsluiter.",
    location: "Strandpaviljoen Zuid",
    address: "Koningin Astrid Boulevard 2",
    city: "Noordwijk",
    days: 83,
    hour: 18,
    capacity: 45,
    image: photoPool.mx5Sunset,
  },
  {
    slug: "techniekavond-onderhoud-mx5",
    title: "Techniekavond: onderhoud MX-5",
    summary: "Leer zelf olie verversen, remmen controleren en roest voorkomen. Onder begeleiding van een ervaren specialist.",
    location: "Clubgarage Utrecht",
    address: "Industrieweg 14",
    city: "Utrecht",
    days: 104,
    hour: 19,
    capacity: 20,
    image: photoPool.headlight,
  },
];

const pastEvents = [
  { slug: "toerrit-brabantse-wal", title: "Toerrit Brabantse Wal", city: "Bergen op Zoom", location: "Hotel De Draak", days: -48, image: photoPool.mazda3Autumn, album: [photoPool.mazda3Autumn, photoPool.mx5Autumn, photoPool.mx5Red, photoPool.mx5Classic, photoPool.mazda6Red, photoPool.cx5White, photoPool.mx5White] },
  { slug: "clubtreffen-lelystad", title: "Clubtreffen Lelystad", city: "Lelystad", location: "Aviodrome", days: -95, image: photoPool.rx7White, album: [photoPool.rx7White, photoPool.rx7Silver, photoPool.rx7Orange, photoPool.rx7Rear, photoPool.rx7OrangeRear, photoPool.rx7BlackLot, photoPool.rx7Black, photoPool.rx7Blue] },
  { slug: "rotary-night", title: "Rotary Night – RX-7 & RX-8", city: "Rotterdam", location: "Van Nelle Fabriek", days: -150, image: photoPool.rx7Black, album: [photoPool.rx7Black, photoPool.mx5LightTrails, photoPool.rainyStreet, photoPool.mountainsNight, photoPool.headlight, photoPool.mx5Black] },
];

function eventDescription(summary: string, extra: string) {
  return `${summary}\n\n${extra}\n\nProgramma\n• Verzamelen en koffie met gebak bij de startlocatie\n• Briefing door de ritleiding en uitreiking van het routeboek\n• Rit in groepen van maximaal 12 auto's, met tussenstop\n• Gezamenlijke afsluiting met een hapje en een drankje\n\nPraktisch\nLeden van MazdaClub Nederland rijden gratis mee; niet-leden betalen € 5,00 per evenement. Zorg voor een volle tank en een geldige APK. Deelname is op eigen risico; de verkeersregels zijn altijd leidend.`;
}

async function main() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    throw new Error("Demodata is alleen bedoeld voor lokaal testen en wordt nooit in productie geladen.");
  }

  console.log("› Bestaande data wissen…");
  await wipe();

  console.log("› Webshop vullen…");
  const categoryIds: Record<string, string> = {};
  for (const [i, c] of categories.entries()) {
    const created = await prisma.productCategory.create({ data: { ...c, sortOrder: i } });
    categoryIds[c.slug] = created.id;
  }
  const variantsBySku: Record<string, { id: string; productId: string; price: number; name: string; productName: string }> = {};
  for (const p of products) {
    const created = await prisma.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        categoryId: categoryIds[p.category],
        basePrice: p.basePrice,
        images: p.images,
        featured: p.featured ?? false,
        variants: {
          create: p.variants.map((v, i) => ({ name: v.name, sku: v.sku, stock: v.stock, price: v.price ?? null, attributes: v.attributes, sortOrder: i })),
        },
      },
      include: { variants: true },
    });
    for (const v of created.variants) {
      variantsBySku[v.sku] = { id: v.id, productId: created.id, price: v.price ?? created.basePrice, name: v.name, productName: created.name };
    }
  }

  console.log("› Leden aanmaken…");
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const users: Record<string, { id: string; isMember: boolean; firstName: string; lastName: string; email: string; plate: string }> = {};
  for (const m of members) {
    const user = await prisma.user.create({
      data: {
        email: m.email,
        passwordHash,
        firstName: m.firstName,
        lastName: m.lastName,
        phone: "06 " + String(10000000 + Math.floor(Math.random() * 89999999)).slice(0, 8),
        city: m.city,
        country: "NL",
        licensePlate: m.plate,
        carModel: m.car,
        role: m.admin ? "ADMIN" : "USER",
        marketingConsent: Math.random() > 0.5,
        createdAt: new Date(Date.now() - (m.membership?.startedDaysAgo ?? 30) * DAY),
      },
    });
    let isMember = false;
    if (m.membership) {
      const startedAt = new Date(Date.now() - m.membership.startedDaysAgo * DAY);
      const periodStart = m.membership.periodStartDaysAgo !== undefined ? new Date(Date.now() - m.membership.periodStartDaysAgo * DAY) : null;
      const periodEnd = periodStart ? addYears(periodStart, 1) : null;
      const membership = await prisma.membership.create({
        data: {
          userId: user.id,
          status: m.membership.status,
          startedAt: m.membership.status === "PENDING" ? null : startedAt,
          currentPeriodStart: m.membership.status === "PENDING" ? null : periodStart,
          currentPeriodEnd: m.membership.status === "PENDING" ? null : periodEnd,
          autoRenew: !!m.membership.subscription,
          mollieSubscriptionId: m.membership.subscription ? `sub_seed${user.id.slice(-8)}` : null,
          createdAt: startedAt,
        },
      });
      isMember = m.membership.status === "ACTIVE" && !!periodEnd && periodEnd > new Date();
      if (periodStart) {
        await prisma.payment.create({
          data: {
            provider: "MOCK",
            providerPaymentId: `mock_seed_mem_${membership.id}`,
            type: "MEMBERSHIP",
            status: "PAID",
            amount: 5000,
            method: ["ideal", "creditcard", "bancontact", "applepay"][Math.floor(Math.random() * 4)],
            description: "Lidmaatschap MazdaClub Nederland",
            userId: user.id,
            membershipId: membership.id,
            isRecurring: m.membership.startedDaysAgo > 365,
            paidAt: periodStart,
            createdAt: periodStart,
          },
        });
      }
    }
    users[m.email] = { id: user.id, isMember, firstName: m.firstName, lastName: m.lastName, email: m.email, plate: m.plate };
  }

  console.log("› Evenementen en albums aanmaken…");
  const createdUpcoming = [];
  for (const e of upcomingEvents) {
    const startsAt = at(e.days, e.hour, e.hour === 9 ? 30 : 0);
    createdUpcoming.push(
      await prisma.event.create({
        data: {
          slug: e.slug,
          title: e.title,
          summary: e.summary,
          description: eventDescription(e.summary, "De route is uitgezet door onze ritcommissie en voert langs rustige, schilderachtige wegen. Onderweg is er volop gelegenheid om foto's te maken en bij te praten met andere liefhebbers."),
          startsAt,
          endsAt: new Date(startsAt.getTime() + 7 * 3_600_000),
          registrationDeadline: new Date(startsAt.getTime() - 2 * DAY),
          locationName: e.location,
          address: e.address,
          city: e.city,
          capacity: e.capacity,
          priceNonMember: 500,
          priceMember: 0,
          imageUrl: unsplash(e.image, 1600),
          status: "PUBLISHED",
        },
      }),
    );
  }
  // Eén concept-evenement om de beheerflow te tonen
  await prisma.event.create({
    data: {
      slug: "openingsrit-nieuw-seizoen",
      title: "Openingsrit nieuw seizoen",
      summary: "Start het nieuwe rijseizoen samen met de club, met koffie en gebak bij de start.",
      description: eventDescription("Start het nieuwe rijseizoen samen met de club, met koffie en gebak bij de start.", "De exacte route volgt binnenkort."),
      startsAt: at(140, 10),
      locationName: "Nog te bepalen",
      city: "Utrecht",
      capacity: 80,
      imageUrl: unsplash(photoPool.mx5WhiteGarage, 1600),
      status: "DRAFT",
    },
  });

  for (const e of pastEvents) {
    const startsAt = at(e.days, 9, 30);
    const event = await prisma.event.create({
      data: {
        slug: e.slug,
        title: e.title,
        summary: `Terugblik op de ${e.title.toLowerCase()} in ${e.city}.`,
        description: eventDescription(`Een geweldige dag met de club in ${e.city}.`, "Dank aan alle deelnemers en vrijwilligers voor deze fantastische editie!"),
        startsAt,
        endsAt: new Date(startsAt.getTime() + 6 * 3_600_000),
        locationName: e.location,
        city: e.city,
        capacity: 60,
        imageUrl: unsplash(e.image, 1600),
        status: "PUBLISHED",
      },
    });
    await prisma.album.create({
      data: {
        slug: e.slug,
        title: e.title,
        description: `Foto's van de ${e.title.toLowerCase()}. Klik op een foto om hem te vergroten of te downloaden.`,
        date: startsAt,
        eventId: event.id,
        coverUrl: unsplash(e.album[0], 1200, 800),
        published: true,
        photos: {
          create: e.album.map((id, i) => ({
            url: unsplash(id, 2000),
            thumbUrl: unsplash(id, 800, 600),
            width: 2000,
            height: 1333,
            caption: i === 0 ? e.title : null,
            sortOrder: i,
          })),
        },
      },
    });
  }
  await prisma.album.create({
    data: {
      slug: "leden-en-hun-mazda",
      title: "Leden en hun Mazda",
      description: "Een selectie van de mooiste auto's van onze leden.",
      date: at(-10, 12),
      coverUrl: unsplash(photoPool.mx5BlueNA, 1200, 800),
      published: true,
      photos: {
        create: [photoPool.mx5BlueNA, photoPool.mx5Sunset, photoPool.mx5WhiteGarage, photoPool.lake, photoPool.rx7Blue, photoPool.mx5LightTrails].map((id, i) => ({
          url: unsplash(id, 2000),
          thumbUrl: unsplash(id, 800, 600),
          width: 2000,
          height: 1333,
          sortOrder: i,
        })),
      },
    },
  });

  console.log("› Inschrijvingen aanmaken…");
  const allUsers = Object.values(users);
  const guests = [
    { firstName: "Kevin", lastName: "Willems", email: "kevin.willems@example.com", licensePlate: "TX-402-G" },
    { firstName: "Iris", lastName: "Peters", email: "iris.peters@example.com", licensePlate: "LB-77-ZK" },
    { firstName: "Mohamed", lastName: "El Amrani", email: "m.elamrani@example.com", licensePlate: "SG-918-H" },
  ];
  for (const [idx, event] of createdUpcoming.entries()) {
    const attendees = allUsers.slice(0, Math.min(allUsers.length, 3 + idx * 2));
    for (const u of attendees) {
      const amount = u.isMember ? 0 : 500;
      const reg = await prisma.eventRegistration.create({
        data: {
          eventId: event.id,
          userId: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          phone: "06 12345678",
          licensePlate: u.plate,
          isMember: u.isMember,
          amount,
          status: "CONFIRMED",
          confirmationSentAt: new Date(),
          createdAt: new Date(Date.now() - (5 + idx) * DAY),
        },
      });
      if (amount > 0) {
        await prisma.payment.create({
          data: { provider: "MOCK", providerPaymentId: `mock_seed_reg_${reg.id}`, type: "EVENT", status: "PAID", amount, method: "ideal", description: `Inschrijving ${event.title}`, userId: u.id, registrationId: reg.id, paidAt: reg.createdAt, createdAt: reg.createdAt },
        });
      }
    }
    for (const g of guests.slice(0, idx % 3 + 1)) {
      const createdAt = new Date(Date.now() - (2 + idx) * DAY);
      const reg = await prisma.eventRegistration.create({
        data: { eventId: event.id, ...g, phone: "06 87654321", remarks: idx === 1 ? "Eerste keer mee!" : null, isMember: false, amount: 500, status: "CONFIRMED", confirmationSentAt: createdAt, createdAt },
      });
      await prisma.payment.create({
        data: { provider: "MOCK", providerPaymentId: `mock_seed_reg_${reg.id}`, type: "EVENT", status: "PAID", amount: 500, method: "bancontact", description: `Inschrijving ${event.title}`, registrationId: reg.id, paidAt: createdAt, createdAt },
      });
    }
  }

  console.log("› Bestellingen aanmaken…");
  type BasePlan = { email: string; skus: Array<[string, number]>; status: OrderStatus; daysAgo: number };
  const basePlans: BasePlan[] = [
    { email: "sanne.devries@example.com", skus: [["MCN-TSH-ZW-M", 1], ["MCN-STK-R12", 2]], status: "COMPLETED", daysAgo: 150 },
    { email: "daan.janssen@example.com", skus: [["MCN-KPH-RVS", 1], ["MCN-SLH-LEER", 1]], status: "SHIPPED", daysAgo: 6 },
    { email: "lotte.bakker@example.com", skus: [["MCN-HOD-ZW-S", 1], ["MCN-THB-ZW", 1]], status: "PAID", daysAgo: 1 },
    { email: "eva.hendriks@example.com", skus: [["MCN-MOK-330", 2], ["MCN-RST-WIT", 1]], status: "PROCESSING", daysAgo: 3 },
    { email: "jesse.dekker@example.com", skus: [["MCN-PET-ZW", 1]], status: "COMPLETED", daysAgo: 95 },
    { email: "bram.visser@example.com", skus: [["MCN-SSJ-ZW-L", 1], ["MCN-PTS-3", 1]], status: "COMPLETED", daysAgo: 40 },
    { email: "noor.deboer@example.com", skus: [["MCN-KPH-ZW", 1], ["MCN-LAN-RD", 2]], status: "SHIPPED", daysAgo: 12 },
    { email: "fleur.smit@example.com", skus: [["MCN-TSH-WT-S", 1]], status: "COMPLETED", daysAgo: 120 },
    { email: "mila.vandijk@example.com", skus: [["MCN-VTD-RD", 1], ["MCN-STK-SET5", 1]], status: "COMPLETED", daysAgo: 70 },
    { email: "thijs.meijer@example.com", skus: [["MCN-HOD-AN-L", 1]], status: "COMPLETED", daysAgo: 175 },
  ];
  const orderPlans: Array<BasePlan & { shipping: ShippingMethod }> = basePlans.map((o) => ({ ...o, shipping: "POSTNL_NL" }));

  let n = 1000;
  for (const plan of orderPlans) {
    const u = users[plan.email];
    const createdAt = new Date(Date.now() - plan.daysAgo * DAY);
    const lines = plan.skus.map(([sku, qty]) => {
      const v = variantsBySku[sku];
      if (!v) throw new Error(`Onbekende SKU in seed: ${sku}`);
      const unit = u.isMember ? Math.round(v.price * 0.75) : v.price;
      return { v, sku, qty, unit, base: v.price };
    });
    const subtotal = lines.reduce((s, l) => s + l.base * l.qty, 0);
    const after = lines.reduce((s, l) => s + l.unit * l.qty, 0);
    const shippingCost = after >= 7500 ? 0 : 495;
    const total = after + shippingCost;
    const order = await prisma.order.create({
      data: {
        orderNumber: `MCN-${createdAt.getFullYear()}-SEED${n++}`,
        userId: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: "06 12345678",
        street: "Voorbeeldstraat",
        houseNumber: String(10 + n % 80),
        postalCode: "3511 AB",
        city: members.find((m) => m.email === plan.email)?.city ?? "Utrecht",
        country: "NL",
        shippingMethod: plan.shipping,
        status: plan.status,
        subtotal,
        discount: subtotal - after,
        shippingCost,
        total,
        memberDiscountApplied: u.isMember,
        trackingCode: plan.status === "SHIPPED" || plan.status === "COMPLETED" ? `3SMCN${n}${Math.floor(Math.random() * 9000 + 1000)}` : null,
        confirmationSentAt: createdAt,
        paidAt: createdAt,
        shippedAt: plan.status === "SHIPPED" || plan.status === "COMPLETED" ? new Date(createdAt.getTime() + DAY) : null,
        createdAt,
        items: {
          create: lines.map((l) => ({
            productId: l.v.productId,
            variantId: l.v.id,
            productName: l.v.productName,
            variantName: l.v.name,
            sku: l.sku,
            unitPrice: l.unit,
            quantity: l.qty,
            lineTotal: l.unit * l.qty,
          })),
        },
      },
    });
    await prisma.payment.create({
      data: { provider: "MOCK", providerPaymentId: `mock_seed_ord_${order.id}`, type: "ORDER", status: "PAID", amount: total, method: ["ideal", "applepay", "creditcard", "googlepay"][n % 4], description: `Bestelling ${order.orderNumber}`, userId: u.id, orderId: order.id, paidAt: createdAt, createdAt },
    });
  }

  console.log("› Partneraanbiedingen en berichten…");
  await prisma.partnerOffer.createMany({
    data: [
      { partnerName: "Garage Voorbeeld (fictief)", title: "10% korting op onderhoud", description: "Leden krijgen 10% korting op arbeidsloon bij een onderhoudsbeurt. Toon je lidnummer bij het maken van de afspraak.", discountCode: "MCN10", url: "https://example.com", membersOnly: true },
      { partnerName: "Detailing Studio (fictief)", title: "Gratis lakreiniging bij een keramische coating", description: "Bij een keramische coating ontvang je als lid een gratis lakreiniging (t.w.v. € 75).", discountCode: "MCNSHINE", url: "https://example.com", membersOnly: true },
    ],
  });
  await prisma.contactMessage.createMany({
    data: [
      { name: "Kevin Willems", email: "kevin.willems@example.com", subject: "Vraag over de Mazda Meeting", message: "Hoi! Mag ik op de meeting ook met een passagier komen? En moet ik me vooraf aanmelden?" },
      { name: "Iris Peters", email: "iris.peters@example.com", subject: "Lidmaatschap voor twee personen", message: "Wij hebben samen één Mazda. Is er een partnerlidmaatschap mogelijk?", handled: true },
    ],
  });

  // Demo-accounts gelden als bevestigd (geen e-mailverificatie nodig om te testen)
  await prisma.user.updateMany({ where: { emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } });

  const counts = await Promise.all([prisma.user.count(), prisma.product.count(), prisma.event.count(), prisma.photo.count(), prisma.order.count()]);
  console.log(`✓ Klaar: ${counts[0]} gebruikers, ${counts[1]} producten, ${counts[2]} evenementen, ${counts[3]} foto's, ${counts[4]} bestellingen.`);
  console.log(`  Beheerder: admin@mazdaclub.nl – wachtwoord: zie SEED_PASSWORD of prisma/seed.ts`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
