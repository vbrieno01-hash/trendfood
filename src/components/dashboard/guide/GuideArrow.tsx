import { MousePointerClick } from "lucide-react";

interface GuideArrowProps {
  label: string;
  className?: string;
}

export default function GuideArrow({ label, className = "" }: GuideArrowProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <MousePointerClick className="w-4 h-4 text-primary animate-bounce shrink-0" />
      <span className="text-[10px] font-semibold text-primary whitespace-nowrap">{label}</span>
    </div>
  );
}
