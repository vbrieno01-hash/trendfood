import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ActionTileProps {
  icon: ReactNode;
  title: string;
  description?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  badge?: ReactNode;
}

export function ActionTile({ icon, title, description, onClick, disabled, className, badge }: ActionTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn("action-tile text-left disabled:opacity-50 disabled:cursor-not-allowed", className)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="action-tile__icon">{icon}</div>
        {badge}
      </div>
      <div className="mt-2 font-display font-semibold text-sm text-foreground">{title}</div>
      {description && <div className="text-xs text-muted-foreground leading-snug">{description}</div>}
    </button>
  );
}