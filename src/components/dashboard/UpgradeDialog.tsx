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
import { Switch } from "@/components/ui/switch";
import PlanCard from "@/components/pricing/PlanCard";
import CardPaymentForm from "@/components/checkout/CardPaymentForm";

interface Plan {
  id: string;
  key: string;
  name: string;
  description: string | null;
  price_cents: number;
  annual_price_cents: number;
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
  const [isAnnual, setIsAnnual] = useState(false);

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
            annual_price_cents: p.annual_price_cents || 0,
            features: Array.isArray(p.features) ? p.features : [],
          }));
        setPlans(paid);
        setLoading(false);
      });
  }, [open]);

  const formatPrice = (cents: number) =>
    `R$ ${(cents / 100).toFixed(0)}`;

  const formatPriceFull = (cents: number) =>
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

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <span className={`text-sm font-medium ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>Mensal</span>
            <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
            <span className={`text-sm font-medium ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
              Anual <span className="text-primary font-bold">(2 Meses Grátis)</span>
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              Carregando planos...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {plans.map((plan) => {
                const showAnnual = isAnnual && plan.annual_price_cents > 0;
                const displayPrice = showAnnual ? formatPrice(plan.annual_price_cents) : formatPriceFull(plan.price_cents);
                const period = showAnnual ? "/ano" : "/mês";
                const subtitle = showAnnual
                  ? `Equivalente a R$ ${((plan.annual_price_cents / 12) / 100).toFixed(2).replace(".", ",")}/mês`
                  : undefined;
                const savingsBadge = showAnnual ? "ECONOMIA DE 17%" : undefined;
                const isSamePlan = currentPlan === plan.key;
                const billingMismatch = isSamePlan && (
                  (isAnnual && true) || (!isAnnual && false)
                );
                const ctaText = billingMismatch
                  ? (isAnnual ? "Mudar para anual" : "Mudar para mensal")
                  : "Assinar agora";
                return (
                  <PlanCard
                    key={plan.id}
                    name={plan.name}
                    price={displayPrice}
                    period={period}
                    subtitle={subtitle}
                    savingsBadge={savingsBadge}
                    description={plan.description || ""}
                    features={plan.features}
                    cta={ctaText}
                    ctaLink="#"
                    highlighted={plan.highlighted}
                    badge={plan.badge || undefined}
                    currentPlan={isSamePlan}
                    billingMismatch={billingMismatch}
                    onSelect={() => handleSelect(plan)}
                  />
                );
              })}
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
          planPrice={isAnnual && selectedPlan.annual_price_cents > 0 ? formatPrice(selectedPlan.annual_price_cents) : formatPriceFull(selectedPlan.price_cents)}
          billing={isAnnual && selectedPlan.annual_price_cents > 0 ? "annual" : "monthly"}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
