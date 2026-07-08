import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CommandHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function CommandHeader({ eyebrow, title, subtitle, icon, actions, className }: CommandHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 md:flex-row md:items-end md:justify-between animate-dashboard-fade-in", className)}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && <div className="dashboard-section-icon shrink-0">{icon}</div>}
        <div className="min-w-0">
          <span className="section-eyebrow">{eyebrow}</span>
          <h1 className="mt-1 font-display text-2xl md:text-3xl font-bold text-foreground leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2 items-center shrink-0">{actions}</div>}
    </div>
  );
}