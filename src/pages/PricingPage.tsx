import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import PlanCard from "@/components/pricing/PlanCard";
import logoIcon from "@/assets/logo-icon.png";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CardPaymentForm from "@/components/checkout/CardPaymentForm";

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
  checkout_url?: string;
  external?: boolean;
}

function formatPrice(cents: number): string {
  if (cents === 0) return "Grátis";
  return `R$ ${(cents / 100).toFixed(0)}`;
}

function mapPlanRow(row: any): PlanData {
  return {
    key: row.key,
    name: row.name,
    price: formatPrice(row.price_cents),
    description: row.description ?? "",
    features: Array.isArray(row.features) ? row.features : [],
    cta: row.price_cents === 0 ? "Começar Grátis" : `Assinar ${row.name}`,
    ctaLink: "/auth",
    highlighted: row.highlighted ?? false,
    badge: row.badge ?? undefined,
    checkout_url: row.checkout_url ?? undefined,
  };
}

const faqs = [
  {
    q: "Posso testar o plano Pro antes de pagar?",
    a: "Sim! Ao se cadastrar você ganha um período de teste gratuito com acesso a todas as funcionalidades do plano Pro.",
  },
  {
    q: "Preciso instalar algum aplicativo?",
    a: "Não. O TrendFood funciona 100% no navegador, tanto para você quanto para seus clientes. Nenhum app precisa ser baixado.",
  },
  {
    q: "Posso trocar de plano depois?",
    a: "Sim, você pode fazer upgrade ou downgrade a qualquer momento diretamente no painel.",
  },
  {
    q: "Como funciona o pagamento?",
    a: "Aceitamos PIX e cartão de crédito. A cobrança é mensal e você pode cancelar quando quiser.",
  },
  {
    q: "O plano Grátis tem alguma limitação de tempo?",
    a: "Não! O plano Grátis é para sempre. Você só paga se quiser desbloquear funcionalidades avançadas.",
  },
];

const PricingPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, organization } = useAuth();
  const currentPlan = organization?.subscription_plan || "free";
  const [selectedPlan, setSelectedPlan] = useState<PlanData | null>(null);
  const [cardFormPlan, setCardFormPlan] = useState<PlanData | null>(null);
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

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

  // Auto-open plan dialog when returning from auth with ?plan=
  useEffect(() => {
    const planParam = searchParams.get("plan");
    if (planParam && user && plans.length > 0 && planParam !== "free") {
      const plan = plans.find((p) => p.key === planParam);
      if (plan) {
        setSelectedPlan(plan);
        setSearchParams({}, { replace: true });
      }
    }
  }, [user, plans, searchParams, setSearchParams]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const handleSelectPlan = (planKey: string) => {
    if (!user) {
      navigate(`/auth?redirect=/planos&plan=${planKey}`);
      return;
    }
    if (planKey === "free") return;
    const plan = plans.find((p) => p.key === planKey);
    if (plan) setSelectedPlan(plan);
  };

  const handleConfirmPlan = () => {
    if (!selectedPlan || !user || !organization) return;
    setSelectedPlan(null);
    setCardFormPlan(selectedPlan);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={handleBack} className="flex items-center gap-2">
            <img src={logoIcon} alt="TrendFood" className="w-8 h-8 rounded-lg object-contain" />
            <span className="font-bold text-foreground text-lg">TrendFood</span>
          </button>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
            {!user && (
              <Button size="sm" asChild>
                <Link to="/auth">Entrar</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 md:py-24 px-4 text-center">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
          Planos e Preços
        </Badge>
        <h1 className="text-3xl md:text-5xl font-extrabold text-foreground mb-4 leading-tight">
          Escolha o plano ideal para{" "}
          <span className="text-primary">seu negócio</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Comece grátis e faça upgrade quando precisar. Sem contratos, cancele a qualquer momento.
        </p>
      </section>

      {/* Plan Cards */}
      <section className="px-4 pb-20">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 items-stretch">
          {loadingPlans ? (
            <div className="col-span-full flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : plans.map((plan) => (
            <PlanCard
              key={plan.name}
              {...plan}
              currentPlan={!!user && currentPlan === plan.key}
              loading={false}
              onSelect={plan.key !== "free" ? () => handleSelectPlan(plan.key) : undefined}
              external={false}
              ctaLink={plan.ctaLink}
            />
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 bg-secondary/40 border-t border-border/60">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-8">
            Perguntas frequentes
          </h2>
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="bg-card rounded-xl border border-border px-4">
                <AccordionTrigger className="text-left font-semibold text-foreground text-sm hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-8 px-4 text-center text-muted-foreground text-sm bg-background">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src={logoIcon} alt="TrendFood" className="w-6 h-6 rounded-md object-contain" />
          <span className="font-semibold text-foreground">TrendFood</span>
        </div>
        <p>© 2025 TrendFood. Feito com ❤️ para o comércio brasileiro.</p>
      </footer>
      {/* Confirmation Dialog */}
      <AlertDialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">
              Confirmar assinatura — {selectedPlan?.name}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Você irá assinar o plano <strong className="text-foreground">{selectedPlan?.name}</strong> por{" "}
                  <strong className="text-foreground">{selectedPlan?.price}/mês</strong> no cartão de crédito.
                </p>
                <ul className="space-y-2">
                  {selectedPlan?.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPlan}>
              Continuar para pagamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Card Payment Form */}
      {organization && cardFormPlan && (
        <CardPaymentForm
          open={!!cardFormPlan}
          onOpenChange={(v) => !v && setCardFormPlan(null)}
          orgId={organization.id}
          plan={cardFormPlan.key}
          planName={cardFormPlan.name}
          planPrice={cardFormPlan.price}
          onSuccess={() => {
            navigate("/dashboard?tab=subscription");
          }}
        />
      )}
    </div>
  );
};

export default PricingPage;
