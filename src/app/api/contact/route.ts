import { fail, ok, readJson, validationFailed } from "@/lib/api";
import { getContactRecipient } from "@/lib/content";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { contactNotification } from "@/lib/email/templates";
import { notifyAdmins } from "@/lib/notifications";
import { checkHuman } from "@/lib/spam";
import { contactSchema } from "@/lib/validation";

/**
 * POST /api/contact
 * Body: { name, email, subject, message, website?, formStartedAt?, turnstileToken? }
 * 200: { ok: true }
 */
export async function POST(req: Request) {
  const parsed = contactSchema.safeParse(await readJson(req));
  if (!parsed.success) return validationFailed(parsed.error);
  const data = parsed.data;

  const human = await checkHuman(data, req.headers, { scope: "contact", limit: 5 });
  if (!human.ok) return fail(human.error, human.status);

  const message = await prisma.contactMessage.create({
    data: { name: data.name, email: data.email, subject: data.subject, message: data.message },
  });

  // Ontvanger instelbaar via Beheer → Instellingen (bijv. info@mazdaclubnederland.nl)
  const to = await getContactRecipient();
  if (to) {
    await sendEmail({ to, replyTo: data.email, ...contactNotification(message) });
  }

  await notifyAdmins({
    type: "contactMessage",
    title: `Contactbericht: ${message.subject}`,
    message: `${message.name} heeft een bericht gestuurd via het contactformulier.`,
    link: "/admin/berichten",
    details: [
      ["Van", `${message.name} (${message.email})`],
      ["Onderwerp", message.subject],
      ["Bericht", message.message.length > 400 ? `${message.message.slice(0, 400)}…` : message.message],
    ],
  });

  return ok({ ok: true });
}
