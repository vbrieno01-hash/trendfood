import { Lock, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface UpgradePromptProps {
  title: string;
  description: string;
}

export default function UpgradePrompt({ title, description }: UpgradePromptProps) {
  return (
    <div className="max-w-md mx-auto py-16 text-center">
      <div className="bg-card border border-border rounded-2xl p-8 space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h2 className="font-bold text-foreground text-xl mb-1.5">{title}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/planos">
            <Zap className="w-4 h-4" />
            Fazer upgrade
          </Link>
        </Button>
      </div>
    </div>
  );
}
