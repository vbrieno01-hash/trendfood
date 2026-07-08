import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CommandPanelProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  variant?: "default" | "accent" | "danger" | "success";
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
  children: ReactNode;
}

const padMap = { none: "", sm: "p-3", md: "p-4", lg: "p-5" };

export function CommandPanel({
  eyebrow, title, description, actions,
  variant = "default", padding = "lg", className, children,
}: CommandPanelProps) {
  const variantClass = variant === "accent" ? "cmd-panel--accent"
    : variant === "danger" ? "cmd-panel--danger"
    : variant === "success" ? "cmd-panel--success" : "";
  return (
    <section className={cn("cmd-panel", variantClass, padMap[padding], className)}>
      {(eyebrow || title || actions) && (
        <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
          <div className="min-w-0">
            {eyebrow && <span className="section-eyebrow">{eyebrow}</span>}
            {title && <h2 className="font-display text-lg font-bold text-foreground mt-1">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}