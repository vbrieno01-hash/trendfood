import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CommandEmptyProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function CommandEmpty({ icon, title, description, action, className }: CommandEmptyProps) {
  return (
    <div className={cn("cmd-panel p-10 text-center flex flex-col items-center gap-3", className)}>
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          {icon}
        </div>
      )}
      <div>
        <div className="font-display font-bold text-lg text-foreground">{title}</div>
        {description && <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{description}</p>}
      </div>
      {action}
    </div>
  );
}