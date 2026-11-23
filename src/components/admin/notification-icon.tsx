import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  CalendarCheck,
  Mail,
  RefreshCw,
  ShoppingBag,
  Undo2,
  UserPlus,
  UserX,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const icons: Record<string, { icon: LucideIcon; className: string }> = {
  accountCreated: { icon: UserPlus, className: "bg-sky-100 text-sky-700" },
  membershipStarted: { icon: BadgeCheck, className: "bg-emerald-100 text-emerald-700" },
  membershipRenewed: { icon: RefreshCw, className: "bg-emerald-100 text-emerald-700" },
  membershipExpired: { icon: UserX, className: "bg-zinc-100 text-zinc-600" },
  eventRegistration: { icon: CalendarCheck, className: "bg-accent text-primary" },
  orderPaid: { icon: ShoppingBag, className: "bg-violet-100 text-violet-700" },
  contactMessage: { icon: Mail, className: "bg-amber-100 text-amber-700" },
  paymentFailed: { icon: AlertTriangle, className: "bg-red-100 text-red-700" },
  paymentRefunded: { icon: Undo2, className: "bg-zinc-100 text-zinc-700" },
};

/** Gekleurd icoon per soort melding. */
export function NotificationIcon({ type, className }: { type: string; className?: string }) {
  const { icon: Icon, className: tone } = icons[type] ?? { icon: Bell, className: "bg-muted text-foreground/70" };
  return (
    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", tone, className)}>
      <Icon className="size-4" />
    </span>
  );
}
