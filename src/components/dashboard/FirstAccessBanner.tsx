import { useState } from "react";
import { X, Lightbulb } from "lucide-react";

interface Props {
  tabKey: string;
  title: string;
  description: string;
}

export default function FirstAccessBanner({ tabKey, title, description }: Props) {
  const storageKey = `first_access_${tabKey}`;
  const [visible, setVisible] = useState(() => !localStorage.getItem(storageKey));

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(storageKey, "1");
    setVisible(false);
  };

  return (
    <div className="mb-4 rounded-xl bg-primary/10 border border-primary/20 p-4 flex items-start gap-3 animate-dashboard-fade-in">
      <div className="p-1.5 rounded-lg bg-primary/20 text-primary shrink-0 mt-0.5">
        <Lightbulb className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
      <button onClick={dismiss} className="p-1 rounded-lg hover:bg-accent transition-colors shrink-0">
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}
