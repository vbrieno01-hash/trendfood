import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MetricTileProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  trend?: "up" | "down" | "flat";
  className?: string;
}

export function MetricTile({ label, value, sub, icon, trend, className }: MetricTileProps) {
  const trendClass = trend === "up" ? "text-[hsl(142_70%_55%)]"
    : trend === "down" ? "text-destructive" : "text-muted-foreground";
  return (
    <div className={cn("metric-tile", className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="metric-tile__label">{label}</span>
        {icon && <span className="text-primary/70 shrink-0">{icon}</span>}
      </div>
      <div className="metric-tile__value">{value}</div>
      {sub && <div className={cn("metric-tile__sub", trend && trendClass)}>{sub}</div>}
    </div>
  );
}