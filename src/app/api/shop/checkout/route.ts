import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { fail, ok, readJson, validationFailed } from "@/lib/api";
import { prisma } from "@/lib/db";
import { isActiveMember } from "@/lib/membership";
import { generateOrderNumber } from "@/lib/orders";
import { startPayment } from "@/lib/payments";
import { enabledShippingMethods } from "@/lib/pricing";
import { getPricing } from "@/lib/settings";
import { buildQuote, resolveCartLines } from "@/lib/shop";
import { checkHuman } from "@/lib/spam";
import { checkoutSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

class StockError extends Error {}

/**
 * POST /api/shop/checkout
 * body: checkoutSchema (items, shippingMethod, contact- en adresgegevens, acceptTerms, anti-spamvelden)
 * → { checkoutUrl, orderNumber }  |  409 bij onvoldoende voorraad
 *
 * Voorraad wordt atomair gereserveerd bij het aanmaken van de bestelling en weer vrijgegeven
 * wanneer de betaling mislukt, verloopt of wordt geannuleerd (zie lib/payments/fulfillment.ts).
 */
export async function POST(req: Request) {
  const parsed = checkoutSchema.safeParse(await readJson(req));
  if (!parsed.success) return validationFailed(parsed.error);
  const data = parsed.data;

  const human = await checkHuman(data, req.headers, { scope: "checkout", limit: 15 });
  if (!human.ok) return fail(human.error, human.status);

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const [lines, isMember, pricing] = await Promise.all([resolveCartLines(data.items), isActiveMember(userId), getPricing()]);
  if (!enabledShippingMethods(pricing).includes(data.shippingMethod)) {
    return fail("Deze verzendmethode is niet (meer) beschikbaar. Kies een andere verzendmethode.", 422, { shippingMethod: "Kies een andere verzendmethode" });
  }

  const problem = lines.find((l) => !l.available || l.stock < l.requested);
  if (problem) {
    const label = problem.variantName && problem.variantName !== "Standaard" ? `${problem.name} (${problem.variantName})` : problem.name;
    return fail(`${label} is niet meer (voldoende) op voorraad. Pas je winkelwagen aan.`, 409);
  }

  const quote = buildQuote(lines, isMember, data.shippingMethod, pricing);
  if (quote.total <= 0) return fail("Deze bestelling kan niet online worden afgerekend. Neem contact met ons op.", 400);

  const shipping = data.shippingMethod !== "PICKUP_EVENT";
  const orderBase = {
    userId,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone || null,
    street: shipping ? data.street || null : null,
    houseNumber: shipping ? data.houseNumber || null : null,
    postalCode: shipping ? (data.postalCode || "").toUpperCase().replace(/\s+/g, " ") || null : null,
    city: shipping ? data.city || null : null,
    country: data.country,
    shippingMethod: data.shippingMethod,
    status: "PENDING" as const,
    subtotal: quote.subtotal,
    discount: quote.discount,
    shippingCost: quote.shippingCost,
    total: quote.total,
    memberDiscountApplied: quote.memberDiscountApplied,
    notes: data.notes || null,
  };

  const itemsData = quote.lines.map((l) => {
    const resolved = lines.find((r) => r.variantId === l.variantId)!;
    return {
      productId: l.productId,
      variantId: l.variantId,
      productName: l.name,
      variantName: l.variantName,
      sku: resolved.sku,
      unitPrice: l.finalUnitPrice,
      quantity: l.quantity,
      lineTotal: l.lineTotal,
    };
  });

  let order: { id: string; orderNumber: string } | null = null;
  try {
    for (let attempt = 0; attempt < 3 && !order; attempt++) {
      try {
        order = await prisma.$transaction(async (tx) => {
          for (const item of itemsData) {
            const reserved = await tx.productVariant.updateMany({
              where: { id: item.variantId, active: true, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } },
            });
            if (reserved.count === 0) {
              const label = item.variantName && item.variantName !== "Standaard" ? `${item.productName} (${item.variantName})` : item.productName;
              throw new StockError(`${label} is niet meer (voldoende) op voorraad. Pas je winkelwagen aan.`);
            }
          }
          return tx.order.create({
            data: { ...orderBase, orderNumber: generateOrderNumber(), items: { create: itemsData } },
            select: { id: true, orderNumber: true },
          });
        });
      } catch (err) {
        // Botsend ordernummer (zeer zeldzaam): opnieuw proberen met een nieuw nummer.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
        throw err;
      }
    }
  } catch (err) {
    if (err instanceof StockError) return fail(err.message, 409);
    console.error("[checkout] bestelling aanmaken mislukt", err);
    return fail("Je bestelling kon niet worden aangemaakt. Probeer het opnieuw.", 500);
  }
  if (!order) return fail("Je bestelling kon niet worden aangemaakt. Probeer het opnieuw.", 500);

  try {
    const { checkoutUrl } = await startPayment({
      type: "ORDER",
      orderId: order.id,
      amount: quote.total,
      description: `Bestelling ${order.orderNumber} – MazdaClub Nederland`,
      customerEmail: data.email,
      customerName: `${data.firstName} ${data.lastName}`,
      userId,
    });
    return ok({ checkoutUrl, orderNumber: order.orderNumber });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "De betaling kon niet worden gestart.", 502);
  }
}
