import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { membershipReminder } from "@/lib/email/templates";
import { notifyAdmins } from "@/lib/notifications";
import { applyPaymentState, syncPayment } from "@/lib/payments";
import { getSettings } from "@/lib/settings";
import { formatDate, formatMemberNumber } from "@/lib/utils";

/**
 * Onderhoudstaak – elk uur aanroepen (crontab, systemd-timer of Vercel Cron):
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://mazdaclub.nl/api/cron/maintenance
 *
 * 1. Verlopen lidmaatschappen op EXPIRED zetten (abonnementen krijgen 7 dagen coulance voor de incasso).
 * 2. Herinneringsmail vóór afloop (standaard 30 dagen; alleen zonder automatische verlenging).
 * 3. Openstaande bestellingen/inschrijvingen ouder dan 2 uur afsluiten (voorraad en plaatsen vrijgeven).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const now = new Date();
  const graceDate = new Date(now.getTime() - 7 * 86_400_000);
  const summary = { expired: 0, reminders: 0, stalePayments: 0 };

  // 1. Verlopen lidmaatschappen
  const expiring = await prisma.membership.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { mollieSubscriptionId: null, currentPeriodEnd: { lt: now } },
        { mollieSubscriptionId: { not: null }, currentPeriodEnd: { lt: graceDate } },
      ],
    },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    take: 500,
  });
  if (expiring.length > 0) {
    const expired = await prisma.membership.updateMany({ where: { id: { in: expiring.map((m) => m.id) }, status: "ACTIVE" }, data: { status: "EXPIRED" } });
    summary.expired = expired.count;
    if (expiring.length <= 10) {
      for (const m of expiring) {
        await notifyAdmins({
          type: "membershipExpired",
          title: `Lidmaatschap verlopen: ${m.user.firstName} ${m.user.lastName}`,
          message: `Het lidmaatschap van ${m.user.firstName} ${m.user.lastName} is verlopen${m.currentPeriodEnd ? ` op ${formatDate(m.currentPeriodEnd)}` : ""} en niet verlengd.`,
          link: `/admin/leden/${m.user.id}`,
          details: [
            ["Lid", `${m.user.firstName} ${m.user.lastName} (${m.user.email})`],
            ["Lidnummer", formatMemberNumber(m.memberNumber)],
          ],
        });
      }
    } else {
      await notifyAdmins({
        type: "membershipExpired",
        title: `${expiring.length} lidmaatschappen verlopen`,
        message: `${expiring.length} lidmaatschappen zijn verlopen en niet verlengd.`,
        link: "/admin/leden?status=verlopen",
      });
    }
  }

  // 2. Herinneringen (aantal dagen instelbaar in Beheer → Instellingen → Lidmaatschap; 0 = uit)
  const reminderDays = (await getSettings("membership")).reminderDaysBefore;
  const remindUntil = new Date(now.getTime() + reminderDays * 86_400_000);
  const toRemind =
    reminderDays > 0
      ? await prisma.membership.findMany({
          where: { status: "ACTIVE", mollieSubscriptionId: null, reminderSentAt: null, currentPeriodEnd: { gte: now, lte: remindUntil } },
          include: { user: true },
          take: 200,
        })
      : [];
  for (const m of toRemind) {
    await sendEmail({ to: m.user.email, ...membershipReminder(m.user, m) });
    await prisma.membership.update({ where: { id: m.id }, data: { reminderSentAt: now } });
    summary.reminders++;
  }

  // 3. Verouderde openstaande betalingen
  const staleBefore = new Date(now.getTime() - 2 * 3_600_000);
  const stale = await prisma.payment.findMany({
    where: { status: { in: ["OPEN", "PENDING"] }, createdAt: { lt: staleBefore } },
    select: { id: true },
    take: 200,
  });
  for (const p of stale) {
    const status = await syncPayment(p.id);
    if (status === "OPEN") {
      await applyPaymentState(p.id, { status: "EXPIRED" });
      summary.stalePayments++;
    }
  }

  return NextResponse.json({ ok: true, ...summary, ranAt: now.toISOString() });
}
