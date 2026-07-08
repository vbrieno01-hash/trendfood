import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "live" | "warn" | "danger" | "info" | "accent" | "neutral";

interface StatusPillProps {
  variant?: Variant;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

export function StatusPill({ variant = "neutral", dot, className, children }: StatusPillProps) {
  const v = variant === "neutral" ? "" : `status-pill--${variant}`;
  const dotColor = variant === "live" ? "bg-[hsl(142_70%_55%)]"
    : variant === "warn" ? "bg-[hsl(38_95%_60%)]"
    : variant === "danger" ? "bg-destructive"
    : variant === "info" ? "bg-[hsl(195_90%_65%)]"
    : variant === "accent" ? "bg-primary" : "bg-muted-foreground";
  return (
    <span className={cn("status-pill", v, className)}>
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", dotColor, variant === "live" && "animate-pulse")} />}
      {children}
    </span>
  );
}