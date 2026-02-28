import { useState } from "react";
import { Lock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import UpgradeDialog from "@/components/dashboard/UpgradeDialog";

interface UpgradePromptProps {
  title: string;
  description: string;
  orgId: string;
  currentPlan: string;
}

export default function UpgradePrompt({ title, description, orgId, currentPlan }: UpgradePromptProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

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
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Zap className="w-4 h-4" />
          Fazer upgrade
        </Button>
      </div>

      <UpgradeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        orgId={orgId}
        currentPlan={currentPlan}
      />
    </div>
  );
}
