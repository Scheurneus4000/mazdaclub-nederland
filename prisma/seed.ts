/**
 * Schone start voor MazdaClub Nederland – géén voorbeelddata.
 *
 *   npm run db:seed          Maakt alleen de standaard webshopcategorieën aan (als die nog niet bestaan).
 *   npm run db:fresh         Lokaal: wist ALLE data en begint opnieuw leeg (weigert in productie).
 *
 * Het eerste beheerdersaccount:
 *   - Op de echte website: ga naar https://<jouw-domein>/installatie en vul de installatiecode in
 *     (omgevingsvariabele SETUP_CODE). Die pagina werkt alleen zolang er nog geen beheerder is.
 *   - Lokaal maakt deze seed automatisch een testbeheerder aan:
 *       e-mail:     SEED_ADMIN_EMAIL of admin@mazdaclub.nl
 *       wachtwoord: SEED_PASSWORD of standaard "MazdaClub2026!"   (alleen lokaal!)
 *
 * Wil je alle schermen met fictieve inhoud bekijken? Gebruik dan lokaal `npm run db:demo`.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ensureDefaultCategories } from "../src/lib/setup";

const prisma = new PrismaClient();
const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
const wipeRequested = process.argv.includes("--wipe");

async function wipeAll() {
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
  // Lidnummers weer vanaf MCN-00001 laten beginnen
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Membership_memberNumber_seq" RESTART WITH 1`);
}

async function main() {
  if (wipeRequested) {
    if (isProduction) throw new Error("--wipe weigert te draaien in productie (dit zou alle echte gegevens wissen).");
    console.log("› Alle data wissen (schone start)…");
    await wipeAll();
  }

  const created = await ensureDefaultCategories(prisma);
  console.log(created ? `› ${created} standaard webshopcategorieën aangemaakt` : "› Webshopcategorieën bestaan al");

  const admins = await prisma.user.count({ where: { role: "ADMIN" } });
  const email = (process.env.SEED_ADMIN_EMAIL || (isProduction ? "" : "admin@mazdaclub.nl")).toLowerCase();
  const password = process.env.SEED_PASSWORD || (isProduction ? "" : "MazdaClub2026!");

  if (admins > 0) {
    console.log("› Er is al een beheerder; geen account aangemaakt");
  } else if (email && password) {
    await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 12),
        firstName: "Beheerder",
        lastName: "MazdaClub",
        role: "ADMIN",
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`› Beheerder aangemaakt: ${email}${isProduction ? "" : " (lokaal testaccount)"}`);
  } else {
    console.log("› Nog geen beheerder. Ga naar /installatie op de website om het eerste beheerdersaccount aan te maken.");
  }

  console.log("✓ Klaar. De website start leeg: voeg evenementen, nieuws, albums en producten toe via /admin.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
