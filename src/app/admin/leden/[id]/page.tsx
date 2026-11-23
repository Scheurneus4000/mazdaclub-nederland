import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreditCard, Mail, MailCheck, Send, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { deleteMember, markUserEmailVerified, resendUserVerification, sendMemberInvite, sendMembershipPaymentLink, setUserRole } from "@/app/admin/actions/members";
import { ActionButton } from "@/components/admin/action-button";
import { ConfirmActionDialog } from "@/components/admin/confirm-action-dialog";
import { ManualMembershipForm, MemberProfileForm, MembershipStatusForm } from "@/components/admin/member-forms";
import { AdminPageHeader, AdminSection, DetailList, TableEmpty } from "@/components/admin/page-title";
import {
  EmailStatusBadge,
  MembershipStatusBadge,
  OrderStatusBadge,
  paymentMethodLabel,
  PaymentStatusBadge,
  paymentTypeLabels,
  RegistrationStatusBadge,
  RoleBadge,
} from "@/components/admin/status-badges";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/form-controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/db";
import { isMembershipActive, membershipView } from "@/lib/membership";
import { isOwnerEmail } from "@/lib/owner";
import { requireAdmin } from "@/lib/session";
import { getPricing } from "@/lib/settings";
import { formatDate, formatDateTime, formatMemberNumber, formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Gebruiker" };
export const dynamic = "force-dynamic";

export default async function AdminMemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      membership: true,
      orders: { orderBy: { createdAt: "desc" }, take: 20 },
      registrations: { orderBy: { createdAt: "desc" }, take: 20, include: { event: { select: { id: true, title: true, startsAt: true } } } },
      payments: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!user) notFound();

  const view = membershipView(user.membership);
  const m = user.membership;
  const isSelf = user.id === admin.id;
  const lastAdmin = user.role === "ADMIN" && (await prisma.user.count({ where: { role: "ADMIN" } })) <= 1;
  const owner = isOwnerEmail(user.email);
  const pricing = await getPricing();
  const active = isMembershipActive(m);
  const autoRenewing = active && !!m?.mollieSubscriptionId;

  return (
    <>
      <AdminPageHeader
        title={`${user.firstName} ${user.lastName}`}
        badge={
          <>
            <MembershipStatusBadge status={view.status} />
            <RoleBadge role={user.role} owner={owner} />
          </>
        }
        description={m ? `Lidnummer ${formatMemberNumber(m.memberNumber)} · account sinds ${formatDate(user.createdAt)}` : `Account sinds ${formatDate(user.createdAt)}`}
        back={{ href: "/admin/leden", label: "Gebruikers & leden" }}
        actions={
          <Button asChild variant="outline" size="sm">
            <a href={`mailto:${user.email}`}>
              <Mail /> E-mail sturen
            </a>
          </Button>
        }
      />

      {sp.aangemaakt && (
        <Alert variant="success" className="mb-6">
          Lid toegevoegd.{" "}
          {sp.uitnodiging === "1"
            ? `Er is een uitnodiging gestuurd naar ${user.email} om een wachtwoord te kiezen.`
            : sp.uitnodiging === "mislukt"
              ? "De uitnodigingsmail kon niet worden verstuurd; probeer het opnieuw met de knop 'Uitnodiging sturen'."
              : "Er is geen uitnodiging gestuurd; dat kan later alsnog met de knop 'Uitnodiging sturen'."}
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <AdminSection title="Lidmaatschap">
            {m ? (
              <DetailList
                items={[
                  ["Status", <MembershipStatusBadge key="s" status={view.status} />],
                  ["Lidnummer", formatMemberNumber(m.memberNumber)],
                  ["Lid sinds", m.startedAt ? formatDate(m.startedAt) : "Nog niet gestart"],
                  ["Huidige periode", m.currentPeriodStart && m.currentPeriodEnd ? `${formatDate(m.currentPeriodStart)} – ${formatDate(m.currentPeriodEnd)}` : null],
                  ["Automatisch verlengen", m.autoRenew ? (m.mollieSubscriptionId ? "Aan (Mollie-abonnement)" : "Aan") : "Uit"],
                  ...(m.mollieSubscriptionId ? ([["Abonnement-ID", <span key="sub" className="font-mono text-xs">{m.mollieSubscriptionId}</span>]] as Array<[string, React.ReactNode]>) : []),
                  ...(m.cancelledAt ? ([["Opgezegd op", formatDate(m.cancelledAt)]] as Array<[string, React.ReactNode]>) : []),
                ]}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Dit account heeft (nog) geen lidmaatschap.</p>
            )}
            {m && (
              <div className="mt-5 border-t border-border pt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status aanpassen</p>
                <MembershipStatusForm key={`${m.status}-${m.updatedAt.toISOString()}`} userId={user.id} status={m.status} />
              </div>
            )}
          </AdminSection>

          <AdminSection
            title={active ? "Lidmaatschap verlengen" : "Betaald lid maken"}
            description={active ? "Verleng handmatig of stuur een betaallink." : "Dit account is nu een gratis account."}
          >
            {autoRenewing ? (
              <p className="text-sm text-muted-foreground">Dit lidmaatschap wordt automatisch verlengd via Mollie. Handmatig verlengen is niet nodig.</p>
            ) : (
              <div className="space-y-5">
                <div className="rounded-lg bg-surface p-4">
                  <p className="text-sm font-semibold">Online laten betalen</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {user.firstName} krijgt een e-mail met een link om in te loggen en {formatPrice(pricing.membershipPriceCents)} online te betalen. Er is geen nieuw
                    account nodig.
                  </p>
                  <div className="mt-3">
                    <ActionButton
                      action={sendMembershipPaymentLink}
                      fields={{ userId: user.id }}
                      variant="outline"
                      size="default"
                      className="w-full"
                      confirm={`Betaallink sturen naar ${user.email}?`}
                    >
                      <CreditCard /> Betaallink sturen
                    </ActionButton>
                  </div>
                </div>
                <ManualMembershipForm
                  userId={user.id}
                  defaultAmount={(pricing.membershipPriceCents / 100).toFixed(2).replace(".", ",")}
                  currentEnd={active && m?.currentPeriodEnd ? formatDate(m.currentPeriodEnd) : null}
                  isRenewal={!!m?.startedAt}
                />
              </div>
            )}
          </AdminSection>

          <AdminSection title="Inloggen">
            <DetailList
              items={[
                ["E-mail", <a key="e" href={`mailto:${user.email}`} className="hover:text-primary">{user.email}</a>],
                ["E-mailadres", <EmailStatusBadge key="v" verifiedAt={user.emailVerifiedAt} />],
                ["Laatst ingelogd", user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Nog nooit"],
              ]}
            />
            {!user.emailVerifiedAt && (
              <div className="mt-4 space-y-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
                <p>
                  Het e-mailadres is nog niet bevestigd.{owner && " Dit is het adres van de eigenaar: na bevestiging krijgt dit account automatisch beheerdersrechten."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <ActionButton action={resendUserVerification} fields={{ userId: user.id }} variant="outline" className="bg-white">
                    <Send /> Bevestigingsmail opnieuw sturen
                  </ActionButton>
                  <ActionButton
                    action={markUserEmailVerified}
                    fields={{ userId: user.id }}
                    variant="ghost"
                    confirm={`Weet je zeker dat ${user.email} van ${user.firstName} is? Markeer alleen als bevestigd als je dit zeker weet.`}
                  >
                    <MailCheck /> Als bevestigd markeren
                  </ActionButton>
                </div>
              </div>
            )}
            <p className="mt-4 text-sm text-muted-foreground">
              {user.lastLoginAt
                ? "Wachtwoord vergeten? Stuur een link waarmee het lid zelf een nieuw wachtwoord kiest."
                : "Dit lid heeft nog nooit ingelogd. Stuur een uitnodiging om zelf een wachtwoord te kiezen."}
            </p>
            <div className="mt-3">
              <ActionButton
                action={sendMemberInvite}
                fields={{ userId: user.id }}
                variant="outline"
                size="default"
                className="w-full"
                confirm={`${user.lastLoginAt ? "Wachtwoordlink" : "Uitnodiging"} sturen naar ${user.email}?`}
              >
                <Send /> {user.lastLoginAt ? "Wachtwoordlink sturen" : "Uitnodiging sturen"}
              </ActionButton>
            </div>
          </AdminSection>

          <AdminSection title="Rechten">
            <p className="mb-4 text-sm text-muted-foreground">
              {user.role === "ADMIN" ? "Dit account heeft toegang tot het beheerpaneel." : "Dit account heeft geen toegang tot het beheerpaneel."}
            </p>
            {owner ? (
              <p className="rounded-lg bg-surface p-3 text-sm text-muted-foreground">
                Dit is de <strong className="text-foreground">eigenaar</strong> van de website (ingesteld via OWNER_EMAIL). De eigenaar houdt altijd
                beheerdersrechten{user.emailVerifiedAt ? "" : " zodra het e-mailadres is bevestigd"} en kan niet worden gedegradeerd of verwijderd.
              </p>
            ) : user.role === "ADMIN" && isSelf ? (
              <Button variant="outline" className="w-full" disabled>
                <ShieldOff /> Eigen rechten kunnen niet worden ingetrokken
              </Button>
            ) : user.role === "ADMIN" ? (
              <ActionButton
                action={setUserRole}
                fields={{ userId: user.id, role: "USER" }}
                variant="outline"
                size="default"
                className="w-full"
                confirm={`Beheerdersrechten van ${user.firstName} intrekken?`}
              >
                <ShieldOff /> Beheerdersrechten intrekken
              </ActionButton>
            ) : (
              <ActionButton
                action={setUserRole}
                fields={{ userId: user.id, role: "ADMIN" }}
                variant="outline"
                size="default"
                className="w-full"
                confirm={`${user.firstName} beheerdersrechten geven? Diegene krijgt toegang tot alle leden- en betaalgegevens.`}
              >
                <ShieldCheck /> Beheerder maken
              </ActionButton>
            )}
          </AdminSection>

          <AdminSection title="Lid verwijderen" description="Verwijdert het account en het lidmaatschap definitief.">
            {isSelf ? (
              <p className="text-sm text-muted-foreground">Je eigen account verwijder je via Mijn Account → Privacy.</p>
            ) : owner ? (
              <p className="text-sm text-muted-foreground">De eigenaar van de website kan niet door een beheerder worden verwijderd.</p>
            ) : lastAdmin ? (
              <p className="text-sm text-muted-foreground">Dit is de laatste beheerder en kan daarom niet worden verwijderd.</p>
            ) : (
              <ConfirmActionDialog
                action={deleteMember}
                fields={{ userId: user.id }}
                className="w-full"
                title={`${user.firstName} ${user.lastName} verwijderen?`}
                description={
                  <>
                    <p>Het account, het lidmaatschap en de persoonsgegevens worden definitief verwijderd. Een automatische verlenging via Mollie wordt eerst stopgezet.</p>
                    <p>Bestellingen en betalingen blijven bewaard voor de boekhouding (wettelijke bewaarplicht), maar zijn daarna niet meer aan dit lid gekoppeld.</p>
                    <p className="font-medium text-foreground">Dit kun je niet ongedaan maken.</p>
                  </>
                }
                requireText="VERWIJDER"
                confirmLabel="Lid definitief verwijderen"
              >
                <Trash2 /> Lid verwijderen
              </ConfirmActionDialog>
            )}
          </AdminSection>
        </div>

        <div className="space-y-6">
          <AdminSection title="Persoonsgegevens" description="Pas de gegevens van het lid aan. Het lid kan deze ook zelf wijzigen via Mijn Account.">
            <MemberProfileForm
              key={user.updatedAt.toISOString()}
              userId={user.id}
              user={{
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                street: user.street,
                houseNumber: user.houseNumber,
                postalCode: user.postalCode,
                city: user.city,
                country: user.country,
                licensePlate: user.licensePlate,
                carModel: user.carModel,
                marketingConsent: user.marketingConsent,
              }}
            />
          </AdminSection>

          <AdminSection title="Evenementinschrijvingen" bodyClassName="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evenement</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Bedrag</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.registrations.length === 0 && <TableEmpty colSpan={4}>Geen inschrijvingen.</TableEmpty>}
                {user.registrations.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link href={`/admin/evenementen/${r.event.id}`} className="font-medium hover:text-primary">
                        {r.event.title}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{formatDate(r.event.startsAt)}</TableCell>
                    <TableCell className="tabular-nums">{r.amount === 0 ? "Gratis" : formatPrice(r.amount)}</TableCell>
                    <TableCell>
                      <RegistrationStatusBadge status={r.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminSection>

          <AdminSection title="Bestellingen" bodyClassName="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordernummer</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead className="text-right">Totaal</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.orders.length === 0 && <TableEmpty colSpan={4}>Geen bestellingen.</TableEmpty>}
                {user.orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link href={`/admin/bestellingen/${o.id}`} className="font-mono text-sm font-semibold hover:text-primary">
                        {o.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{formatDate(o.createdAt)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPrice(o.total)}</TableCell>
                    <TableCell>
                      <OrderStatusBadge status={o.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminSection>

          <AdminSection title="Betalingen" bodyClassName="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Omschrijving</TableHead>
                  <TableHead>Methode</TableHead>
                  <TableHead className="text-right">Bedrag</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.payments.length === 0 && <TableEmpty colSpan={6}>Geen betalingen.</TableEmpty>}
                {user.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap text-sm">{formatDateTime(p.createdAt)}</TableCell>
                    <TableCell className="text-sm">{paymentTypeLabels[p.type]}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm" title={p.description}>{p.description}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{paymentMethodLabel(p.provider, p.method)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPrice(p.amount)}</TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={p.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminSection>
        </div>
      </div>
    </>
  );
}
