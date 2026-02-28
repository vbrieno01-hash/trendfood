import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PlanCard from "@/components/pricing/PlanCard";
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

const PLANS = [
  {
    key: "free",
    name: "Grátis",
    price: "Grátis",
    description: "Para começar a vender online",
    features: [
      "Cardápio digital ilimitado",
      "Até 5 itens no cardápio",
      "Até 3 mesas",
      "Pedidos via QR Code",
      "Suporte por chat",
    ],
    cta: "Plano atual",
    ctaLink: "#",
    priceCents: 0,
  },
  {
    key: "pro",
    name: "Pro",
    price: "R$ 99",
    description: "Para restaurantes em crescimento",
    features: [
      "Itens ilimitados no cardápio",
      "Mesas ilimitadas",
      "Painel Cozinha (KDS)",
      "Painel do Garçom",
      "Cupons de desconto",
      "Mais vendidos",
      "Controle de caixa",
      "Impressão automática",
    ],
    cta: "Assinar Pro",
    ctaLink: "#",
    highlighted: true,
    badge: "Mais popular",
    priceCents: 9900,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "R$ 249",
    description: "Para operações completas",
    features: [
      "Tudo do Pro",
      "Relatórios avançados",
      "Robô de WhatsApp",
      "Multi-unidades",
      "Motoboys integrados",
      "Suporte prioritário",
    ],
    cta: "Assinar Enterprise",
    ctaLink: "#",
    priceCents: 24900,
  },
];

const SubscriptionTab = () => {
  const { organization, session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const planLimits = usePlanLimits(organization);

  const currentPlan = organization?.subscription_plan || "free";
  const mpReturn = searchParams.get("mp_return");

  // Subscription details state
  const [subDetails, setSubDetails] = useState<{
    next_payment_date: string | null;
    status: string | null;
    payments: { date: string; amount: number; status: string }[];
  } | null>(null);
  const [subDetailsLoading, setSubDetailsLoading] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);

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
      toast.success("Voltou do Mercado Pago! Seu plano será ativado automaticamente em instantes.", {
        duration: 6000,
      });
      searchParams.delete("mp_return");
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  // Auto-select plan from URL param
  useEffect(() => {
    const planFromUrl = searchParams.get("plan");
    if (planFromUrl && planFromUrl !== "free" && PLANS.some((p) => p.key === planFromUrl)) {
      handleSubscribe(planFromUrl);
      searchParams.delete("plan");
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  const handleSubscribe = async (planKey: string) => {
    if (!organization || !session) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-mp-subscription", {
        body: { org_id: organization.id, plan: planKey },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.details || data.error);

      if (data?.init_point) {
        toast.info("Redirecionando para o Mercado Pago...");
        window.location.href = data.init_point;
      }
    } catch (err: any) {
      console.error("[SubscriptionTab] Subscribe error:", err);
      toast.error("Erro ao criar assinatura", {
        description: err.message || "Tente novamente",
      });
    } finally {
      setLoading(false);
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

      toast.success("Assinatura cancelada. Seu plano foi revertido para Grátis.");
      setShowCancelDialog(false);
      setTimeout(() => window.location.reload(), 1500);
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
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Gerenciar Assinatura</h1>
        <p className="text-muted-foreground text-sm">
          Assinando para:{" "}
          <span className="font-medium text-foreground">{organization?.name}</span>
        </p>
      </div>

      {/* Current subscription status */}
      {(isPaid || isLifetime) && (
        <div className="max-w-md mx-auto bg-card border border-border rounded-2xl p-5 space-y-3">
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
                  <span>Cobrança recorrente ativa — o Mercado Pago cobra automaticamente todo mês.</span>
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

      {/* Plan cards */}
      <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.key}
            name={plan.name}
            price={plan.price}
            description={plan.description}
            features={plan.features}
            cta={plan.cta}
            ctaLink={plan.ctaLink}
            highlighted={plan.highlighted}
            badge={plan.badge}
            currentPlan={currentPlan === plan.key}
            loading={loading}
            onSelect={
              plan.key !== "free" && plan.key !== currentPlan && !isLifetime
                ? () => handleSubscribe(plan.key)
                : undefined
            }
          />
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Criando assinatura no Mercado Pago...
        </div>
      )}

      {/* Cancel dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao cancelar, sua assinatura será interrompida e o plano voltará para <strong>Grátis</strong>.
              As funcionalidades avançadas serão desativadas imediatamente.
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
