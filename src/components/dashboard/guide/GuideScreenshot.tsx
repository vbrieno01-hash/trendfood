import { MousePointerClick } from "lucide-react";

export interface ArrowAnnotation {
  /** Position as percentage from top-left (0-100) */
  x: number;
  y: number;
  label: string;
}

interface GuideScreenshotProps {
  src: string;
  alt: string;
  arrows?: ArrowAnnotation[];
}

export default function GuideScreenshot({ src, alt, arrows = [] }: GuideScreenshotProps) {
  return (
    <div className="my-3 rounded-xl border border-border bg-muted/30 shadow-sm overflow-hidden select-none">
      <div className="relative">
        <img
          src={src}
          alt={alt}
          className="w-full h-auto block"
          loading="lazy"
        />
        {arrows.map((arrow, i) => (
          <div
            key={i}
            className="absolute flex items-center gap-1 pointer-events-none"
            style={{ left: `${arrow.x}%`, top: `${arrow.y}%`, transform: "translate(-50%, -50%)" }}
          >
            <MousePointerClick className="w-5 h-5 text-primary animate-bounce shrink-0 drop-shadow-md" />
            <span className="text-[11px] font-bold text-primary bg-background/80 backdrop-blur-sm rounded px-1.5 py-0.5 shadow-sm whitespace-nowrap">
              {arrow.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
