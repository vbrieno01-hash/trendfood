import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import PlanCard from "@/components/pricing/PlanCard";
import logoIcon from "@/assets/logo-icon.png";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const PLAN_KEYS = {
  free: "free",
  pro: "pro",
  enterprise: "enterprise",
} as const;

const plans = [
  {
    key: PLAN_KEYS.free,
    name: "Grátis",
    price: "Grátis",
    description: "Ideal para começar e testar a plataforma",
    features: [
      "Catálogo digital",
      "Até 20 itens no cardápio",
      "1 ponto de atendimento (QR Code)",
      "Pedidos por QR Code",
      "Link compartilhável do catálogo",
    ],
    cta: "Começar Grátis",
    ctaLink: "/auth",
  },
  {
    key: PLAN_KEYS.pro,
    name: "Pro",
    price: "R$ 99",
    description: "Para negócios que querem crescer com controle total",
    features: [
      "Tudo do plano Grátis",
      "Itens ilimitados no cardápio",
      "Pontos de atendimento ilimitados",
      "Painel de Produção (KDS)",
      "Controle de Caixa completo",
      "Cupons de desconto",
      "Ranking de mais vendidos",
      "Impressora térmica 80mm",
      "Painel do Atendente",
    ],
    cta: "Assinar Pro",
    ctaLink: "/auth",
    highlighted: true,
    badge: "Recomendado",
  },
  {
    key: PLAN_KEYS.enterprise,
    name: "Enterprise",
    price: "R$ 249",
    description: "Para redes e operações de alta demanda",
    features: [
      "Tudo do plano Pro",
      "Múltiplas unidades",
      "Relatórios avançados",
      "Suporte prioritário",
      "Integração com delivery",
      "Gerente de conta dedicado",
    ],
    cta: "Assinar Enterprise",
    ctaLink:
      "https://wa.me/5511999999999?text=Quero+saber+mais+sobre+o+plano+Enterprise+TrendFood",
    external: true,
  },
];

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
  const { user, organization } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const currentPlan = organization?.subscription_plan || "free";

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const handleSelectPlan = async (planKey: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (planKey === "free") return;

    setLoadingPlan(planKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan: planKey },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({
        title: "Erro ao iniciar checkout",
        description: err.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
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
          {plans.map((plan) => (
            <PlanCard
              key={plan.name}
              {...plan}
              currentPlan={currentPlan === plan.key}
              loading={loadingPlan === plan.key}
              onSelect={user && plan.key !== "free" ? () => handleSelectPlan(plan.key) : undefined}
              external={!user ? plan.external : false}
              ctaLink={!user ? "/auth" : plan.ctaLink}
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
    </div>
  );
};

export default PricingPage;
