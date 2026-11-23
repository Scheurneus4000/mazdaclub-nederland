import { Prisma, type EventRegistration } from "@prisma/client";
import { auth } from "@/auth";
import { fail, ok, readJson, validationFailed } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getTakenSeats, isRegistrationOpen } from "@/lib/events";
import { isActiveMember } from "@/lib/membership";
import { sendRegistrationConfirmation, startPayment } from "@/lib/payments";
import { eventPriceFor, PENDING_HOLD_MINUTES } from "@/lib/pricing";
import { checkHuman } from "@/lib/spam";
import { normalizeLicensePlate } from "@/lib/utils";
import { eventRegistrationSchema } from "@/lib/validation";

class RegistrationError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type TxResult = { kind: "created"; registration: EventRegistration } | { kind: "resume"; checkoutUrl: string };

/**
 * POST /api/events/[slug]/register
 * Body: { firstName, lastName, email, phone, licensePlate, remarks?, acceptTerms: true, website?, formStartedAt?, turnstileToken? }
 * 200: { redirectUrl } (gratis, direct bevestigd) of { checkoutUrl } (doorsturen naar betaling)
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const parsed = eventRegistrationSchema.safeParse(await readJson(req));
  if (!parsed.success) return validationFailed(parsed.error);
  const data = parsed.data;

  const human = await checkHuman(data, req.headers, { scope: "event-register", limit: 8 });
  if (!human.ok) return fail(human.error, human.status);

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event || event.status !== "PUBLISHED") return fail("Dit evenement bestaat niet (meer).", 404);
  if (!isRegistrationOpen(event)) return fail("De inschrijving voor dit evenement is gesloten.", 409);

  // Ledenprijs uitsluitend op basis van de ingelogde sessie – nooit op basis van een ingevuld e-mailadres.
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const isMember = await isActiveMember(userId);
  const amount = eventPriceFor(event, isMember);
  const email = data.email;
  const holdSince = new Date(Date.now() - PENDING_HOLD_MINUTES * 60_000);

  let result: TxResult;
  try {
    result = await prisma.$transaction(
      async (tx): Promise<TxResult> => {
        const existing = await tx.eventRegistration.findFirst({
          where: {
            eventId: event.id,
            email,
            OR: [{ status: "CONFIRMED" }, { status: "PENDING", createdAt: { gte: holdSince } }],
          },
          include: { payments: { where: { status: { in: ["OPEN", "PENDING"] } }, orderBy: { createdAt: "desc" }, take: 1 } },
          orderBy: { createdAt: "desc" },
        });

        if (existing?.status === "CONFIRMED") {
          throw new RegistrationError("Met dit e-mailadres is al iemand ingeschreven voor dit evenement.", 409);
        }
        if (existing?.status === "PENDING") {
          // Betaling nog open (bijv. tabblad gesloten): laat de deelnemer verder betalen.
          const openPayment = existing.payments[0];
          if (openPayment?.checkoutUrl && existing.amount === amount) {
            return { kind: "resume", checkoutUrl: openPayment.checkoutUrl };
          }
          await tx.eventRegistration.update({ where: { id: existing.id }, data: { status: "CANCELLED" } });
        }

        const taken = await getTakenSeats(event.id, tx);
        if (taken >= event.capacity) throw new RegistrationError("Helaas, dit evenement is inmiddels volgeboekt.", 409);

        const registration = await tx.eventRegistration.create({
          data: {
            eventId: event.id,
            userId,
            firstName: data.firstName,
            lastName: data.lastName,
            email,
            phone: data.phone,
            licensePlate: normalizeLicensePlate(data.licensePlate),
            remarks: data.remarks || null,
            isMember,
            amount,
            status: amount === 0 ? "CONFIRMED" : "PENDING",
          },
        });
        return { kind: "created", registration };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (err) {
    if (err instanceof RegistrationError) return fail(err.message, err.status);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      return fail("Het is op dit moment erg druk. Probeer het over een paar seconden opnieuw.", 409);
    }
    console.error("[inschrijving] mislukt", err);
    return fail("Je inschrijving kon niet worden verwerkt. Probeer het later opnieuw.", 500);
  }

  if (result.kind === "resume") return ok({ checkoutUrl: result.checkoutUrl });

  const registration = result.registration;
  if (amount === 0) {
    await sendRegistrationConfirmation(registration.id);
    return ok({ redirectUrl: `/evenementen/${event.slug}?ingeschreven=1` });
  }

  try {
    const { checkoutUrl } = await startPayment({
      type: "EVENT",
      amount,
      description: `Inschrijving ${event.title}`,
      customerEmail: email,
      customerName: `${data.firstName} ${data.lastName}`,
      userId,
      registrationId: registration.id,
    });
    return ok({ checkoutUrl });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "De betaling kon niet worden gestart.", 502);
  }
}
