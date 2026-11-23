import type { EventStatus, MembershipStatus, OrderStatus, PaymentProvider, PaymentStatus, PaymentType, RegistrationStatus, Role } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { orderStatusLabels } from "@/lib/orders";
import { paymentStatusLabels } from "@/lib/payments";

type Variant = "default" | "secondary" | "outline" | "success" | "warning" | "danger" | "info" | "dark";

const orderVariants: Record<OrderStatus, Variant> = {
  PENDING: "warning",
  PAID: "info",
  PROCESSING: "info",
  SHIPPED: "success",
  COMPLETED: "success",
  CANCELLED: "secondary",
  REFUNDED: "danger",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={orderVariants[status]}>{orderStatusLabels[status]}</Badge>;
}

const paymentVariants: Record<PaymentStatus, Variant> = {
  OPEN: "warning",
  PENDING: "warning",
  PAID: "success",
  FAILED: "danger",
  CANCELED: "secondary",
  EXPIRED: "secondary",
  REFUNDED: "danger",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={paymentVariants[status]}>{paymentStatusLabels[status]}</Badge>;
}

export const paymentTypeLabels: Record<PaymentType, string> = {
  ORDER: "Webshop",
  EVENT: "Evenement",
  MEMBERSHIP: "Lidmaatschap",
};

export const registrationStatusLabels: Record<RegistrationStatus, string> = {
  PENDING: "Wacht op betaling",
  CONFIRMED: "Bevestigd",
  CANCELLED: "Geannuleerd",
};

const registrationVariants: Record<RegistrationStatus, Variant> = {
  PENDING: "warning",
  CONFIRMED: "success",
  CANCELLED: "secondary",
};

export function RegistrationStatusBadge({ status }: { status: RegistrationStatus }) {
  return <Badge variant={registrationVariants[status]}>{registrationStatusLabels[status]}</Badge>;
}

export const eventStatusLabels: Record<EventStatus, string> = {
  DRAFT: "Concept",
  PUBLISHED: "Gepubliceerd",
  CANCELLED: "Geannuleerd",
};

const eventVariants: Record<EventStatus, Variant> = { DRAFT: "secondary", PUBLISHED: "success", CANCELLED: "danger" };

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return <Badge variant={eventVariants[status]}>{eventStatusLabels[status]}</Badge>;
}

export type MembershipDisplayStatus = MembershipStatus | "NONE";

export const membershipStatusLabels: Record<MembershipDisplayStatus, string> = {
  ACTIVE: "Actief",
  PENDING: "In afwachting",
  EXPIRED: "Verlopen",
  CANCELLED: "Opgezegd",
  NONE: "Geen lid",
};

const membershipVariants: Record<MembershipDisplayStatus, Variant> = {
  ACTIVE: "success",
  PENDING: "warning",
  EXPIRED: "secondary",
  CANCELLED: "danger",
  NONE: "outline",
};

export function MembershipStatusBadge({ status }: { status: MembershipDisplayStatus }) {
  return <Badge variant={membershipVariants[status]}>{membershipStatusLabels[status]}</Badge>;
}

export function RoleBadge({ role, owner = false }: { role: Role; owner?: boolean }) {
  if (owner) return <Badge variant="default">Eigenaar</Badge>;
  return role === "ADMIN" ? <Badge variant="dark">Beheerder</Badge> : null;
}

/** Status van het e-mailadres (bevestigd via link, uitnodiging of wachtwoordreset). */
export function EmailStatusBadge({ verifiedAt }: { verifiedAt: Date | null }) {
  return verifiedAt ? <Badge variant="success">Bevestigd</Badge> : <Badge variant="warning">Niet bevestigd</Badge>;
}

/** Leesbare naam van de betaalprovider. */
export const paymentProviderLabels: Record<PaymentProvider, string> = {
  MOLLIE: "Mollie",
  STRIPE: "Stripe",
  MOCK: "Testbetaling",
  MANUAL: "Handmatig",
};

/** Leesbare betaalmethode (Mollie/Stripe-codes en handmatige betaalwijzen). */
export const paymentMethodLabels: Record<string, string> = {
  ideal: "iDEAL",
  bancontact: "Bancontact",
  creditcard: "Creditcard",
  card: "Creditcard",
  applepay: "Apple Pay",
  googlepay: "Google Pay",
  paypal: "PayPal",
  directdebit: "Automatische incasso",
  sepa_debit: "Automatische incasso",
  banktransfer: "Overboeking",
  cash: "Contant",
  transfer: "Overboeking",
  free: "Gratis / erelid",
  wero: "Wero",
};

export function paymentMethodLabel(provider: PaymentProvider, method: string | null): string {
  const label = method ? (paymentMethodLabels[method] ?? method) : "–";
  return provider === "MANUAL" ? `Handmatig (${method ? label.toLowerCase() : "contant/overboeking"})` : label;
}
