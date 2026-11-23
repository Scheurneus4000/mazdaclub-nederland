"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fromAmsterdamInput } from "@/components/admin/datetime";
import { imageUrlHint, isAllowedImageUrl } from "@/components/admin/image-hosts";
import { buildEventIcs } from "@/lib/calendar";
import { getContent } from "@/lib/content";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import * as templates from "@/lib/email/templates";
import { sendRegistrationConfirmation } from "@/lib/payments";
import { isRichText, richTextToPlain, sanitizeRichText } from "@/lib/rich-text";
import { requireAdmin } from "@/lib/session";
import { formatPrice, parseEuroToCents, slugify } from "@/lib/utils";
import { eventAdminSchema, fieldErrors } from "@/lib/validation";
import { failure, success, type ActionState } from "./state";

const idSchema = z.object({ id: z.string().min(1).max(64) });

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

async function uniqueEventSlug(base: string, excludeId?: string): Promise<string> {
  const root = base || "evenement";
  let slug = root;
  let i = 2;
  while (await prisma.event.findFirst({ where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) }, select: { id: true } })) {
    slug = `${root}-${i++}`;
  }
  return slug;
}

function revalidateEvent(id?: string, slug?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/evenementen");
  if (id) revalidatePath(`/admin/evenementen/${id}`);
  revalidatePath("/evenementen");
  if (slug) revalidatePath(`/evenementen/${slug}`);
  revalidatePath("/");
}

export async function saveEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(formData, "id") || undefined;

  const parsed = eventAdminSchema.safeParse({
    title: str(formData, "title"),
    slug: str(formData, "slug"),
    summary: str(formData, "summary"),
    description: str(formData, "description"),
    startsAt: fromAmsterdamInput(formData.get("startsAt")) ?? undefined,
    endsAt: fromAmsterdamInput(formData.get("endsAt")),
    registrationDeadline: fromAmsterdamInput(formData.get("registrationDeadline")),
    locationName: str(formData, "locationName"),
    address: str(formData, "address"),
    city: str(formData, "city"),
    capacity: str(formData, "capacity"),
    priceNonMember: parseEuroToCents(str(formData, "priceNonMember")),
    priceMember: parseEuroToCents(str(formData, "priceMember")),
    imageUrl: str(formData, "imageUrl"),
    status: str(formData, "status") || "DRAFT",
  });
  if (!parsed.success) return failure("Controleer de gemarkeerde velden.", fieldErrors(parsed.error));
  const data = parsed.data;

  const fields: Record<string, string> = {};
  const description = isRichText(data.description) ? sanitizeRichText(data.description) : data.description;
  if (richTextToPlain(description).length < 20) fields.description = "Schrijf een beschrijving van minimaal 20 tekens";
  if (data.endsAt && data.endsAt < data.startsAt) fields.endsAt = "Einde ligt vóór de start";
  if (data.registrationDeadline && data.registrationDeadline > data.startsAt) fields.registrationDeadline = "Sluiting moet vóór de start liggen";
  if (!isAllowedImageUrl(data.imageUrl)) fields.imageUrl = imageUrlHint;
  if (id) {
    const confirmed = await prisma.eventRegistration.count({ where: { eventId: id, status: "CONFIRMED" } });
    if (data.capacity < confirmed) fields.capacity = `Er zijn al ${confirmed} bevestigde deelnemers`;
  }
  if (Object.keys(fields).length) return failure("Controleer de gemarkeerde velden.", fields);

  const slug = await uniqueEventSlug(slugify(data.slug || data.title), id);
  const record = {
    title: data.title,
    slug,
    summary: data.summary,
    description,
    startsAt: data.startsAt,
    endsAt: data.endsAt ?? null,
    registrationDeadline: data.registrationDeadline ?? null,
    locationName: data.locationName,
    address: data.address || null,
    city: data.city,
    capacity: data.capacity,
    priceNonMember: data.priceNonMember,
    priceMember: data.priceMember,
    imageUrl: data.imageUrl || null,
    status: data.status,
  };

  if (!id) {
    const created = await prisma.event.create({ data: record });
    revalidateEvent(created.id, created.slug);
    redirect(`/admin/evenementen/${created.id}?aangemaakt=1`);
  }

  const before = await prisma.event.findUnique({ where: { id }, select: { status: true, slug: true } });
  if (!before) return failure("Evenement niet gevonden.");
  const updated = await prisma.event.update({ where: { id }, data: record });
  revalidateEvent(updated.id, updated.slug);
  if (before.slug !== updated.slug) revalidatePath(`/evenementen/${before.slug}`);

  if (before.status !== "CANCELLED" && updated.status === "CANCELLED") {
    return success("Evenement geannuleerd. Let op: deelnemers worden niet automatisch geïnformeerd en betalingen niet automatisch terugbetaald.");
  }
  return success("Evenement opgeslagen.");
}

export async function deleteEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return failure("Ongeldig evenement.");
  const { id } = parsed.data;

  const paid = await prisma.payment.count({ where: { type: "EVENT", status: "PAID", registration: { eventId: id } } });
  if (paid > 0) {
    return failure("Dit evenement heeft betaalde inschrijvingen. Zet de status op 'Geannuleerd' in plaats van het te verwijderen.");
  }
  const event = await prisma.event.delete({ where: { id } }).catch(() => null);
  if (!event) return failure("Evenement niet gevonden.");
  revalidateEvent(undefined, event.slug);
  redirect("/admin/evenementen?verwijderd=1");
}

export async function cancelRegistration(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return failure("Ongeldige inschrijving.");

  const reg = await prisma.eventRegistration.findUnique({
    where: { id: parsed.data.id },
    include: { payments: { where: { status: "PAID" }, select: { amount: true } }, event: true },
  });
  if (!reg) return failure("Inschrijving niet gevonden.");
  if (reg.status === "CANCELLED") return failure("Deze inschrijving is al geannuleerd.");

  const wasConfirmed = reg.status === "CONFIRMED";
  await prisma.eventRegistration.update({ where: { id: reg.id }, data: { status: "CANCELLED" } });
  revalidateEvent(reg.event.id, reg.event.slug);

  const paidAmount = reg.payments.reduce((s, p) => s + p.amount, 0);
  // Alleen bevestigde deelnemers een bericht sturen (een openstaande betaling is nog geen inschrijving).
  let mailed = false;
  if (wasConfirmed) {
    const content = await getContent().catch(() => null);
    mailed = await sendEmail({
      to: reg.email,
      ...templates.eventRegistrationCancelled(reg, reg.event, { paidAmount, contact: { email: content?.contactEmail, phone: content?.contactPhone } }),
    });
  }
  const mailNote = mailed ? ` ${reg.firstName} heeft hierover een e-mail ontvangen.` : "";
  return success(
    paidAmount > 0
      ? `Inschrijving geannuleerd.${mailNote} Stort ${formatPrice(paidAmount)} terug via Beheer → Betalingen of het Mollie-dashboard.`
      : `Inschrijving geannuleerd. De plek is weer beschikbaar.${mailNote}`,
  );
}

export async function confirmRegistration(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return failure("Ongeldige inschrijving.");
  const reg = await prisma.eventRegistration.findUnique({ where: { id: parsed.data.id }, include: { event: { select: { id: true, slug: true } } } });
  if (!reg) return failure("Inschrijving niet gevonden.");
  if (reg.status === "CONFIRMED") return failure("Deze inschrijving is al bevestigd.");

  await prisma.eventRegistration.update({ where: { id: reg.id }, data: { status: "CONFIRMED" } });
  await sendRegistrationConfirmation(reg.id);
  revalidateEvent(reg.event.id, reg.event.slug);
  return success("Inschrijving handmatig bevestigd en bevestigingsmail verstuurd.");
}

export async function resendRegistrationConfirmation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return failure("Ongeldige inschrijving.");
  const reg = await prisma.eventRegistration.findUnique({ where: { id: parsed.data.id }, include: { event: true } });
  if (!reg) return failure("Inschrijving niet gevonden.");
  if (reg.status !== "CONFIRMED") return failure("Alleen bevestigde inschrijvingen krijgen een bevestiging.");

  const attach = reg.event.status === "PUBLISHED";
  const sent = await sendEmail({
    to: reg.email,
    ...templates.eventRegistrationConfirmation(reg, reg.event, { hasCalendarAttachment: attach }),
    attachments: attach
      ? [{ filename: `${reg.event.slug}.ics`, content: Buffer.from(buildEventIcs(reg.event), "utf8"), contentType: "text/calendar; charset=utf-8; method=PUBLISH" }]
      : undefined,
  });
  if (!sent) return failure("Versturen mislukt. Controleer de e-mailinstellingen.");
  await prisma.eventRegistration.update({ where: { id: reg.id }, data: { confirmationSentAt: new Date() } });
  revalidatePath(`/admin/evenementen/${reg.eventId}`);
  return success(`Bevestiging opnieuw verstuurd naar ${reg.email}.`);
}
