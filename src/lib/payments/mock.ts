import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/utils";
import type { PaymentProviderAdapter } from "./types";

/**
 * Testbetalingen voor lokale ontwikkeling: de "checkout" is een interne pagina
 * (/betaling/mock) waar je een betaling als geslaagd of mislukt kunt markeren.
 * In productie is deze adapter uitgeschakeld (zie isMockAllowed).
 */
export const mockAdapter: PaymentProviderAdapter = {
  name: "MOCK",

  async createPayment({ payment }) {
    return {
      providerPaymentId: `mock_${payment.id}`,
      checkoutUrl: siteUrl(`/betaling/mock?id=${payment.id}`),
    };
  },

  async getPaymentState(providerPaymentId) {
    const payment = await prisma.payment.findUniqueOrThrow({ where: { providerPaymentId } });
    return { status: payment.status, method: payment.method, paidAt: payment.paidAt, localPaymentId: payment.id };
  },

  /** Testmodus: er gaat geen geld terug; de status wordt door refundPayment bijgewerkt. */
  async refund({ providerPaymentId }) {
    return { refundId: `mock_refund_${providerPaymentId}_${Date.now()}` };
  },
};

export function isMockAllowed(): boolean {
  return process.env.PAYMENT_PROVIDER === "mock" && (process.env.NODE_ENV !== "production" || process.env.ALLOW_MOCK_PAYMENTS === "true");
}
