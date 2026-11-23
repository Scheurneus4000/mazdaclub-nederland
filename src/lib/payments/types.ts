import type { Payment, PaymentProvider, PaymentStatus } from "@prisma/client";

export type CreateProviderPaymentArgs = {
  payment: Payment;
  description: string;
  redirectUrl: string;
  webhookUrl?: string;
  customerEmail: string;
  customerName: string;
  /** Eerste betaling van een terugkerend lidmaatschap (Mollie: sequenceType "first"). */
  recurringFirst?: { customerId: string };
};

export type ProviderPaymentResult = {
  providerPaymentId: string;
  checkoutUrl: string;
};

export type ProviderPaymentState = {
  status: PaymentStatus;
  method?: string | null;
  paidAt?: Date | null;
  customerId?: string | null;
  subscriptionId?: string | null;
  amountCents?: number;
  /** Interne Payment-id uit de metadata (indien aanwezig). */
  localPaymentId?: string | null;
};

export type RefundArgs = {
  providerPaymentId: string;
  /** Te restitueren bedrag in centen; leeg = het volledige (resterende) bedrag. */
  amountCents?: number;
  /** Totaalbedrag van de betaling in centen. */
  totalCents: number;
  description?: string;
};

export interface PaymentProviderAdapter {
  readonly name: PaymentProvider;
  createPayment(args: CreateProviderPaymentArgs): Promise<ProviderPaymentResult>;
  getPaymentState(providerPaymentId: string): Promise<ProviderPaymentState>;
  /** Terugbetaling starten bij de provider. Geeft de id van de terugbetaling terug. */
  refund?(args: RefundArgs): Promise<{ refundId: string }>;
}
