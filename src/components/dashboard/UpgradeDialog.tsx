import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Sparkles } from "lucide-react";
import PlanCard from "@/components/pricing/PlanCard";
import CardPaymentForm from "@/components/checkout/CardPaymentForm";

interface Plan {
  id: string;
  key: string;
  name: string;
  description: string | null;
  price_cents: number;
  features: string[];
  highlighted: boolean;
  badge: string | null;
  sort_order: number;
}

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  currentPlan: string;
}

export default function UpgradeDialog({ open, onOpenChange, orgId, currentPlan }: UpgradeDialogProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("platform_plans")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .then(({ data }) => {
        const paid = (data || [])
          .filter((p: any) => p.key !== "free")
          .map((p: any) => ({
            ...p,
            features: Array.isArray(p.features) ? p.features : [],
          }));
        setPlans(paid);
        setLoading(false);
      });
  }, [open]);

  const formatPrice = (cents: number) =>
    `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

  const handleSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    setCheckoutOpen(true);
  };

  const handleSuccess = () => {
    setCheckoutOpen(false);
    onOpenChange(false);
    window.location.reload();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">Fazer upgrade</DialogTitle>
                <DialogDescription>
                  Escolha o plano ideal para o seu negócio
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              Carregando planos...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  name={plan.name}
                  price={formatPrice(plan.price_cents)}
                  description={plan.description || ""}
                  features={plan.features}
                  cta="Assinar agora"
                  ctaLink="#"
                  highlighted={plan.highlighted}
                  badge={plan.badge || undefined}
                  currentPlan={currentPlan === plan.key}
                  onSelect={() => handleSelect(plan)}
                />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedPlan && (
        <CardPaymentForm
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          orgId={orgId}
          plan={selectedPlan.key}
          planName={selectedPlan.name}
          planPrice={formatPrice(selectedPlan.price_cents)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
