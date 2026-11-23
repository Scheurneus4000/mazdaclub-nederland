import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
  href,
  accent = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  href?: string;
  accent?: boolean;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className={cn("text-sm font-medium", accent ? "text-white/80" : "text-muted-foreground")}>{label}</p>
        {icon && (
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-[18px]",
              accent ? "bg-white/15 text-white" : "bg-accent text-primary",
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p className={cn("mt-3 text-3xl font-bold tracking-tight tabular-nums", accent ? "text-white" : "text-foreground")}>{value}</p>
      {hint && <div className={cn("mt-1.5 text-xs", accent ? "text-white/70" : "text-muted-foreground")}>{hint}</div>}
      {href && (
        <ArrowUpRight
          className={cn(
            "absolute right-4 bottom-4 size-4 opacity-0 transition-opacity group-hover:opacity-100",
            accent ? "text-white" : "text-primary",
          )}
        />
      )}
    </>
  );

  const classes = cn(
    "group relative block rounded-xl border p-5 shadow-xs transition-shadow",
    accent ? "border-transparent bg-primary" : "border-border bg-white",
    href && "hover:shadow-md",
    className,
  );

  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
