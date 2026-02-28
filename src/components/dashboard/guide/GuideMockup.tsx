import { Monitor } from "lucide-react";

interface GuideMockupProps {
  title?: string;
  children: React.ReactNode;
}

export default function GuideMockup({ title, children }: GuideMockupProps) {
  return (
    <div className="my-3 rounded-xl border border-border bg-muted/30 shadow-sm overflow-hidden select-none">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/60 border-b border-border">
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-destructive/60" />
          <span className="w-2 h-2 rounded-full bg-yellow-400/60" />
          <span className="w-2 h-2 rounded-full bg-green-500/60" />
        </div>
        {title && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Monitor className="w-3 h-3" />
            {title}
          </span>
        )}
      </div>
      {/* Content */}
      <div className="p-3 text-xs">{children}</div>
    </div>
  );
}
