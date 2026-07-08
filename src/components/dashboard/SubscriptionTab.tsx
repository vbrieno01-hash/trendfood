import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CardPaymentForm from "@/components/checkout/CardPaymentForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import PlanCard from "@/components/pricing/PlanCard";
import { CommandHeader } from "@/components/dashboard/command";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, CheckCircle, Calendar, Store, CreditCard, ChevronDown, ChevronUp } from "lucide-react";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PlanData {
  key: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  ctaLink: string;
  highlighted: boolean;
  badge?: string;
  priceCents: number;
  annualPriceCents: number;
  quarterlyPriceCents: number;
}

type BillingCycle = "monthly" | "quarterly" | "annual";

function formatPrice(cents: number): string {
  if (cents === 0) return "Grátis";
  return `R$ ${(cents / 100).toFixed(0)}`;
}

function mapPlanRow(row: any): PlanData {
  const price = formatPrice(row.price_cents);
  return {
    key: row.key,
    name: row.name,
    price,
    description: row.description ?? "",
    features: Array.isArray(row.features) ? row.features : [],
    cta: row.price_cents === 0 ? "Plano atual" : `Assinar ${row.name}`,
    ctaLink: "#",
    highlighted: row.highlighted ?? false,
    badge: row.badge ?? undefined,
    priceCents: row.price_cents,
    annualPriceCents: row.annual_price_cents || 0,
    quarterlyPriceCents: row.quarterly_price_cents || 0,
  };
}

const SubscriptionTab = () => {
  const { organization, session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const billingCycle = organization?.billing_cycle || "monthly";
  const isAnnualBilling = billingCycle === "annual";
  const [selectedBilling, setSelectedBilling] = useState<BillingCycle>("monthly");
  const [cardFormPlan, setCardFormPlan] = useState<{ key: string; name: string; price: string } | null>(null);
  const isAnnual = selectedBilling === "annual";
  const isQuarterly = selectedBilling === "quarterly";
  const planLimits = usePlanLimits(organization);
  const promoEligible = planLimits.promoEligible;

  const currentPlan = organization?.subscription_plan || "free";
  const mpReturn = searchParams.get("mp_return");
  const subscriptionExpired = planLimits.subscriptionExpired;

  // Subscription details state
  const [subDetails, setSubDetails] = useState<{
    next_payment_date: string | null;
    status: string | null;
    payments: { date: string; amount: number; status: string }[];
  } | null>(null);
  const [subDetailsLoading, setSubDetailsLoading] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);

  // Pending PIX awaiting reconciliation
  const [pendingPix, setPendingPix] = useState<{ payment_id: string; created_at: string; plan: string } | null>(null);
  const [verifyingPix, setVerifyingPix] = useState(false);

  const loadPendingPix = async () => {
    if (!organization?.id) return;
    const cutoff = new Date(Date.now() - 35 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("pending_subscription_payments")
      .select("payment_id, created_at, plan")
      .eq("organization_id", organization.id)
      .eq("status", "pending")
      .gt("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setPendingPix(data || null);
  };

  useEffect(() => {
    loadPendingPix();
    if (!organization?.id) return;
    const interval = setInterval(loadPendingPix, 15000);
    return () => clearInterval(interval);
  }, [organization?.id]);

  const handleVerifyPix = async () => {
    if (!pendingPix) return;
    setVerifyingPix(true);
    try {
      const { data, error } = await supabase.functions.invoke("reconcile-pending-pix", {
        body: { payment_id: pendingPix.payment_id },
      });
      if (error) throw new Error(error.message);
      const result = (data as any)?.results?.[0];
      if (result?.activated) {
        toast.success("Pagamento confirmado! Plano ativado.");
        setTimeout(() => window.location.reload(), 1500);
      } else if (result?.status === "approved") {
        toast.success("Pagamento já confirmado.");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.info("Pagamento ainda não foi confirmado pelo Mercado Pago. Tente novamente em instantes.");
      }
      await loadPendingPix();
    } catch (err: any) {
      toast.error("Erro ao verificar pagamento", { description: err?.message });
    } finally {
      setVerifyingPix(false);
    }
  };

  // Fetch subscription details from MP
  useEffect(() => {
    const isPaid = currentPlan === "pro" || currentPlan === "enterprise";
    if (!isPaid || !organization?.id) return;
    setSubDetailsLoading(true);
    supabase.functions
      .invoke("get-subscription-details", { body: { org_id: organization.id } })
      .then(({ data, error }) => {
        if (!error && data && !data.error) {
          setSubDetails(data);
        }
      })
      .catch(() => {})
      .finally(() => setSubDetailsLoading(false));
  }, [organization?.id, currentPlan]);

  useEffect(() => {
    if (mpReturn === "true") {
      toast.success("Voltou do TrendFood! Seu plano será ativado automaticamente em instantes.", {
        duration: 6000,
      });
      searchParams.delete("mp_return");
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  // Fetch plans from database
  useEffect(() => {
    supabase
      .from("platform_plans")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setPlans(data.map(mapPlanRow));
        }
        setLoadingPlans(false);
      });
  }, []);

  // Auto-select plan from URL param
  useEffect(() => {
    const planFromUrl = searchParams.get("plan");
    if (planFromUrl && planFromUrl !== "free" && plans.length > 0 && plans.some((p) => p.key === planFromUrl)) {
      handleSubscribe(planFromUrl);
      searchParams.delete("plan");
      setSearchParams(searchParams, { replace: true });
    }
  }, [plans]);

  const handleSubscribe = (planKey: string) => {
    if (!organization || !session) return;
    const planData = plans.find((p) => p.key === planKey);
    if (planData) {
      const showPromo = promoEligible && selectedBilling === "monthly" && planData.priceCents > 0;
      let displayPrice = planData.price;
      if (showPromo) {
        displayPrice = `R$ ${(Math.round(planData.priceCents / 2) / 100).toFixed(2).replace(".", ",")}`;
      } else if (isAnnual && planData.annualPriceCents > 0) {
        displayPrice = formatPrice(planData.annualPriceCents);
      } else if (isQuarterly && planData.quarterlyPriceCents > 0) {
        displayPrice = formatPrice(planData.quarterlyPriceCents);
      }
      setCardFormPlan({ key: planData.key, name: planData.name, price: displayPrice });
    }
  };

  const handleCancelSubscription = async () => {
    if (!organization) return;
    setCancelLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-mp-subscription", {
        body: { org_id: organization.id },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const expiresAt = organization?.trial_ends_at
        ? format(new Date(organization.trial_ends_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
        : null;
      toast.success(
        expiresAt
          ? `Assinatura cancelada. O acesso continua até ${expiresAt}.`
          : "Assinatura cancelada.",
        { duration: 6000 }
      );
      setShowCancelDialog(false);
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      console.error("[SubscriptionTab] Cancel error:", err);
      toast.error("Erro ao cancelar assinatura", {
        description: err.message || "Tente novamente",
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const isPaid = currentPlan === "pro" || currentPlan === "enterprise";
  const isLifetime = currentPlan === "lifetime";

  return (
    <div className="space-y-6">
      {/* Header */}
      <CommandHeader
        eyebrow="Plano"
        title="Gerenciar Assinatura"
        subtitle={`Assinando para: ${organization?.name ?? ""}`}
        icon={<CreditCard className="w-5 h-5" />}
      />

      {/* Current subscription status */}
      {pendingPix && (
        <div className="max-w-md mx-auto rounded-2xl p-5 space-y-3 border border-yellow-500/40 bg-yellow-500/10 animate-dashboard-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span className="font-semibold text-foreground">Pagamento PIX em verificação</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Detectamos um pagamento PIX recente do plano <span className="font-medium text-foreground capitalize">{pendingPix.plan}</span>.
            Se você já pagou, clique no botão abaixo para confirmar agora. Caso contrário, aguarde — confirmamos automaticamente em até 1 minuto.
          </p>
          <Button onClick={handleVerifyPix} disabled={verifyingPix} className="w-full">
            {verifyingPix ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verificando...</>) : "Já paguei, verificar agora"}
          </Button>
        </div>
      )}

      {(isPaid || isLifetime) && (
        <div className="max-w-md mx-auto dashboard-glass rounded-2xl p-5 space-y-3 animate-dashboard-fade-in dash-delay-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground">Plano atual</span>
            </div>
            <Badge variant="default" className="capitalize">{currentPlan}</Badge>
          </div>

          {!isLifetime && (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {planLimits.subscriptionExpired ? (
                  <span className="text-destructive font-medium">Assinatura expirada</span>
                ) : (
                  <span>Válido por mais {planLimits.subscriptionDaysLeft} dias</span>
                )}
              </div>

              {planLimits.subscriptionExpired && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Renove sua assinatura para continuar usando os recursos.</span>
                </div>
              )}

              {!planLimits.subscriptionExpired && (
                <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 p-3 rounded-lg">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Cobrança recorrente ativa — o TrendFood cobra automaticamente todo mês.</span>
                </div>
              )}

              {/* Next billing date */}
              {subDetailsLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando detalhes da assinatura...
                </div>
              )}

              {subDetails?.next_payment_date && !subDetailsLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  <CreditCard className="w-4 h-4 flex-shrink-0 text-primary" />
                  <span>
                    Próxima cobrança:{" "}
                    <span className="font-medium text-foreground">
                      {format(new Date(subDetails.next_payment_date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </span>
                </div>
              )}

              {/* Payment history */}
              {subDetails && subDetails.payments.length > 0 && !subDetailsLoading && (
                <Collapsible open={paymentsOpen} onOpenChange={setPaymentsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                      Histórico de pagamentos ({subDetails.payments.length})
                      {paymentsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="rounded-lg border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Data</TableHead>
                            <TableHead className="text-xs">Valor</TableHead>
                            <TableHead className="text-xs text-right">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {subDetails.payments.map((p, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-xs">
                                {p.date ? format(new Date(p.date), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                              </TableCell>
                              <TableCell className="text-xs">
                                {p.amount ? `R$ ${(p.amount).toFixed(2).replace(".", ",")}` : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge
                                  variant={p.status === "approved" ? "default" : "destructive"}
                                  className="text-[10px] px-1.5 py-0.5"
                                >
                                  {p.status === "approved" ? "Pago" : p.status === "pending" ? "Pendente" : p.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setShowCancelDialog(true)}
              >
                Cancelar assinatura
              </Button>
            </>
          )}

          {isLifetime && (
            <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 p-3 rounded-lg">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>Plano vitalício — acesso completo para sempre!</span>
            </div>
          )}
        </div>
      )}

      {/* Billing Selector */}
      <div className="flex items-center justify-center gap-1 animate-dashboard-fade-in dash-delay-2">
        <div className="inline-flex rounded-lg border border-border p-1 bg-muted/50">
          {([
            { value: "monthly" as BillingCycle, label: "Mensal" },
            { value: "quarterly" as BillingCycle, label: "Trimestral", badge: "-10%" },
            { value: "annual" as BillingCycle, label: "Anual", badge: "-17%" },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedBilling(opt.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                selectedBilling === opt.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
              {opt.badge && (
                <span className={`ml-1 text-xs font-bold ${selectedBilling === opt.value ? 'text-primary-foreground' : 'text-primary'}`}>
                  {opt.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto animate-dashboard-fade-in dash-delay-3">
        {loadingPlans ? (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : plans.map((plan) => {
          const showAnnual = isAnnual && plan.annualPriceCents > 0;
          const showQuarterly = isQuarterly && plan.quarterlyPriceCents > 0;
          let displayPrice = plan.price;
          let period = "/mês";
          if (showAnnual) { displayPrice = formatPrice(plan.annualPriceCents); period = "/ano"; }
          else if (showQuarterly) { displayPrice = formatPrice(plan.quarterlyPriceCents); period = "/tri"; }
          const showPromo = promoEligible && selectedBilling === "monthly" && plan.priceCents > 0;
          const subtitle = showAnnual
            ? `Equivalente a R$ ${((plan.annualPriceCents / 12) / 100).toFixed(2).replace(".", ",")}/mês`
            : showQuarterly
              ? `Equivalente a R$ ${((plan.quarterlyPriceCents / 3) / 100).toFixed(2).replace(".", ",")}/mês`
              : showPromo
                ? "Depois volta ao preço normal"
                : undefined;
          const savingsBadge = showAnnual ? "ECONOMIA DE 17%" : showQuarterly ? "ECONOMIA DE 10%" : undefined;
          const orgBilling = organization?.billing_cycle || "monthly";
          // Se a assinatura expirou, ninguém é o "plano atual" — libera todos os botões pra renovar
          const isSamePlan = !subscriptionExpired && currentPlan === plan.key;
          const isExpiredSamePlan = subscriptionExpired && currentPlan === plan.key;
          const billingMismatch = isSamePlan && plan.priceCents > 0 && selectedBilling !== orgBilling;
          const ctaText = isExpiredSamePlan
            ? "Renovar assinatura"
            : billingMismatch
            ? `Mudar para ${selectedBilling === "annual" ? "anual" : selectedBilling === "quarterly" ? "trimestral" : "mensal"}`
            : showPromo ? "🔥 Aproveitar oferta" : plan.cta;
          return (
            <PlanCard
              key={plan.key}
              name={plan.name}
              price={displayPrice}
              period={period}
              subtitle={subtitle}
              savingsBadge={savingsBadge}
              description={plan.description}
              features={plan.features}
              cta={ctaText}
              ctaLink={plan.ctaLink}
              highlighted={plan.highlighted}
              badge={plan.badge}
              currentPlan={isSamePlan}
              billingMismatch={billingMismatch}
              loading={false}
              promoPrice={showPromo ? `R$ ${(Math.round(plan.priceCents / 2) / 100).toFixed(2).replace(".", ",")}` : undefined}
              originalPrice={showPromo ? plan.price : undefined}
              onSelect={
                (!isSamePlan || billingMismatch) && !isLifetime
                  ? () => handleSubscribe(plan.key)
                  : undefined
              }
            />
          );
        })}
      </div>

      {/* Card Payment Form */}
      {organization && cardFormPlan && (
        <CardPaymentForm
          open={!!cardFormPlan}
          onOpenChange={(v) => !v && setCardFormPlan(null)}
          orgId={organization.id}
          plan={cardFormPlan.key}
          planName={cardFormPlan.name}
          planPrice={cardFormPlan.price}
          billing={selectedBilling}
          promo={promoEligible && selectedBilling === "monthly"}
          onSuccess={() => setTimeout(() => window.location.reload(), 1500)}
        />
      )}

      {/* Cancel dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {isAnnualBilling ? (
                  <>
                    <div className="flex items-start gap-2 text-destructive bg-destructive/10 p-3 rounded-lg text-sm">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Atenção:</strong> Seu plano anual possui multa de rescisão de 20% sobre o saldo restante, conforme os Termos de Uso.
                      </span>
                    </div>
                    <p>O acesso continuará disponível até o fim do período já pago.</p>
                  </>
                ) : (
                  <p>
                    Ao cancelar, a cobrança recorrente será interrompida.
                    Você continuará com acesso aos recursos até o fim do período atual.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelLoading}>Manter assinatura</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={cancelLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Cancelando...
                </>
              ) : (
                "Sim, cancelar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SubscriptionTab;
