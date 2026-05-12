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
  annual_price_cents: number;
  quarterly_price_cents: number;
  features: string[];
  highlighted: boolean;
  badge: string | null;
  sort_order: number;
}

type BillingCycle = "monthly" | "quarterly" | "annual";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  currentPlan: string;
  promoEligible?: boolean;
}

export default function UpgradeDialog({ open, onOpenChange, orgId, currentPlan, promoEligible }: UpgradeDialogProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState<BillingCycle>("monthly");
  const isAnnual = selectedBilling === "annual";
  const isQuarterly = selectedBilling === "quarterly";

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
            quarterly_price_cents: p.quarterly_price_cents || 0,
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scroll-smooth">
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

          {/* Billing Selector */}
          <div className="flex items-center justify-center gap-1 pt-2">
            <div className="inline-flex rounded-lg border border-border p-1 bg-muted/50">
              {([
                { value: "monthly" as BillingCycle, label: "Mensal" },
                { value: "quarterly" as BillingCycle, label: "Trimestral", badge: "-10%" },
                { value: "annual" as BillingCycle, label: "Anual", badge: "-17%" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedBilling(opt.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    selectedBilling === opt.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                  {opt.badge && (
                    <span className={`ml-1 text-[10px] font-bold ${selectedBilling === opt.value ? 'text-primary-foreground' : 'text-primary'}`}>
                      {opt.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile plan quick-jump pills (so Enterprise não fica escondido) */}
          {!loading && plans.length > 1 && (
            <div className="flex sm:hidden items-center justify-center gap-2 pt-2">
              {plans.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    document
                      .getElementById(`upgrade-plan-${p.key}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-bold border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  Ver {p.name} ↓
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              Carregando planos...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {plans.map((plan) => {
                const showAnnual = isAnnual && plan.annual_price_cents > 0;
                const showQuarterly = isQuarterly && plan.quarterly_price_cents > 0;
                let displayPrice = formatPrice(plan.price_cents);
                let period = "/mês";
                if (showAnnual) { displayPrice = formatPrice(plan.annual_price_cents); period = "/ano"; }
                else if (showQuarterly) { displayPrice = formatPrice(plan.quarterly_price_cents); period = "/tri"; }
                const subtitle = showAnnual
                  ? `Equivalente a R$ ${((plan.annual_price_cents / 12) / 100).toFixed(2).replace(".", ",")}/mês`
                  : showQuarterly
                    ? `Equivalente a R$ ${((plan.quarterly_price_cents / 3) / 100).toFixed(2).replace(".", ",")}/mês`
                    : undefined;
                const savingsBadge = showAnnual ? "ECONOMIA DE 17%" : showQuarterly ? "ECONOMIA DE 10%" : undefined;
                const isSamePlan = currentPlan === plan.key;

                // Promo pricing: half price for first month (monthly only)
                const showPromo = promoEligible && selectedBilling === "monthly" && !isSamePlan;
                const promoPrice = showPromo
                  ? `R$ ${(Math.round(plan.price_cents / 2) / 100).toFixed(2).replace(".", ",")}`
                  : undefined;
                const originalPrice = showPromo ? formatPriceFull(plan.price_cents) : undefined;

                return (
                  <div key={plan.id} id={`upgrade-plan-${plan.key}`} className="scroll-mt-4">
                  <PlanCard
                    name={plan.name}
                    price={displayPrice}
                    period={period}
                    subtitle={showPromo ? "Depois: " + formatPriceFull(plan.price_cents) + "/mês" : subtitle}
                    savingsBadge={savingsBadge}
                    description={plan.description || ""}
                    features={plan.features}
                    cta={showPromo ? "🔥 Aproveitar oferta" : "Assinar agora"}
                    ctaLink="#"
                    highlighted={plan.highlighted}
                    badge={plan.badge || undefined}
                    currentPlan={isSamePlan}
                    billingMismatch={false}
                    onSelect={() => handleSelect(plan)}
                    promoPrice={promoPrice}
                    originalPrice={originalPrice}
                  />
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedPlan && (() => {
        const showPromoInCheckout = promoEligible && selectedBilling === "monthly";
        let checkoutPrice = formatPriceFull(selectedPlan.price_cents);
        if (showPromoInCheckout) {
          checkoutPrice = `R$ ${(Math.round(selectedPlan.price_cents / 2) / 100).toFixed(2).replace(".", ",")}`;
        } else if (isAnnual && selectedPlan.annual_price_cents > 0) {
          checkoutPrice = formatPrice(selectedPlan.annual_price_cents);
        } else if (isQuarterly && selectedPlan.quarterly_price_cents > 0) {
          checkoutPrice = formatPrice(selectedPlan.quarterly_price_cents);
        }
        return (
          <CardPaymentForm
            open={checkoutOpen}
            onOpenChange={setCheckoutOpen}
            orgId={orgId}
            plan={selectedPlan.key}
            planName={selectedPlan.name}
            planPrice={checkoutPrice}
            billing={selectedBilling}
            promo={showPromoInCheckout}
            onSuccess={handleSuccess}
          />
        );
      })()}
    </>
  );
}
