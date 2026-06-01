import { ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";

export function Section({
  title,
  icon,
  children,
  defaultOpen = true,
  rightAction,
  accent = "primary",
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  rightAction?: ReactNode;
  accent?: "primary" | "amber" | "emerald" | "blue" | "violet";
}) {
  const [open, setOpen] = useState(defaultOpen);
  const accentMap: Record<string, string> = {
    primary: "from-primary/10 to-transparent",
    amber: "from-amber-500/10 to-transparent",
    emerald: "from-emerald-500/10 to-transparent",
    blue: "from-blue-500/10 to-transparent",
    violet: "from-violet-500/10 to-transparent",
  };
  return (
    <div className="admin-glass rounded-2xl overflow-hidden animate-admin-fade-in">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r ${accentMap[accent]} hover:bg-muted/20 transition`}
      >
        {icon && <div className="text-foreground/80">{icon}</div>}
        <h3 className="text-base font-bold text-foreground flex-1 text-left">{title}</h3>
        {rightAction && <div onClick={(e) => e.stopPropagation()}>{rightAction}</div>}
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="p-4 border-t border-border/40">{children}</div>}
    </div>
  );
}