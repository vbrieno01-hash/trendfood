import { useState, useEffect } from "react";
import { usePlatformContent } from "@/hooks/usePlatformContent";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import ShowcaseSection from "@/components/landing/ShowcaseSection";
import ComparisonSection from "@/components/landing/ComparisonSection";
import SavingsCalculator from "@/components/landing/SavingsCalculator";
import PlanCard from "@/components/pricing/PlanCard";
import { supabase } from "@/integrations/supabase/client";

import {
  BarChart3, Zap, ArrowRight, QrCode, UtensilsCrossed, TrendingUp,
  ChevronRight, Flame, BellRing, Wallet, Tag, Printer, BarChart2,
  Bike, MessageCircle, Instagram, Smartphone, Package, CreditCard, Loader2,
} from "lucide-react";

/* ── Default data (fallbacks when CMS is empty) ── */

const defaultProblems = [
  { image: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=600&q=80", title: "Pedido em papel e confusão no atendimento", description: "Pedido que chega por papelzinho e se perde — atendente sem saber a fila, item errado, cliente insatisfeito." },
  { image: "https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=600&q=80", title: "Clientes esperando para pagar", description: "Fila parada esperando atendente com maquininha, sem conseguir fechar a conta. Rotatividade baixa, lucro menor." },
  { image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80", title: "Pagando até 27% de comissão", description: "Cada venda no marketplace, desconto pesado. Final do mês, o lucro sumiu em taxas que você nem vê." },
];

const defaultSteps = [
  { title: "Crie seu catálogo online", description: "Monte categorias, preços e fotos em minutos. Seu catálogo fica disponível via link para qualquer dispositivo, sem precisar baixar nenhum app." },
  { title: "Gere QR Codes para cada ponto de atendimento", description: "Cada ponto recebe um QR Code único. O cliente escaneia e faz o pedido direto pelo celular, sem precisar chamar o atendente." },
  { title: "Equipe recebe o pedido em tempo real", description: "O painel de produção (KDS) toca um alerta sonoro e imprime automaticamente cada pedido. A equipe acompanha tudo no painel." },
  { title: "Feche o caixa com relatório completo", description: "Abertura e fechamento de turno, registro de sangrias e conferência de saldo. Veja faturamento e mais vendidos do dia." },
];

const defaultFeatures = [
  { title: "Catálogo Digital", description: "Monte seu catálogo com categorias, preços e fotos. Acessível via link ou QR Code." },
  { title: "Pedidos por QR Code", description: "Cada ponto de atendimento tem QR único. O cliente pede sem precisar de app." },
  { title: "Painel de Produção (KDS)", description: "Tela dedicada ao atendimento com alerta sonoro e impressão automática." },
  { title: "Painel do Atendente", description: "Visão de todos os pedidos ativos e fechamento de conta com PIX integrado." },
  { title: "Controle de Caixa", description: "Abra e feche turnos, registre sangrias e confira o saldo ao final." },
  { title: "Mais Vendidos", description: "Ranking de produtos por período com receita gerada por cada item." },
  { title: "Cupons de Desconto", description: "Crie promoções com valor fixo ou percentual e gerencie o uso." },
  { title: "Faturamento em Tempo Real", description: "Dashboard com gráfico dos últimos 7 dias, ticket médio e total do dia." },
  { title: "Impressora Térmica", description: "Impressão automática 80mm com QR Code PIX no recibo do cliente." },
  { title: "Gestão de Motoboys", description: "Cadastre motoboys, atribua entregas, acompanhe em tempo real e controle pagamentos." },
  { title: "Gestão de Insumos", description: "Controle ingredientes com ficha técnica e baixa automática a cada venda." },
  { title: "Precificação Inteligente", description: "Cálculo automático de margem e preço sugerido por markup sobre custo." },
  { title: "Delivery Próprio", description: "Receba pedidos de delivery sem taxas. Gestão de motoboys e rastreamento em tempo real." },
  { title: "Programa de Fidelidade", description: "Sistema de pontos por compra com troca automática por descontos." },
];

const defaultBenefitCards = [
  { title: "Cardápio Digital", description: "Catálogo completo com QR Code por mesa. Cliente pede sem app." },
  { title: "Insumos + Precificação", description: "Ficha técnica de ingredientes, baixa automática e margem calculada." },
  { title: "Pagamento Online", description: "PIX automático integrado. Confirma pagamento sem maquininha." },
];

const defaultProofBadges = ["0% comissão", "Motoboys próprios", "Impressão térmica", "PIX integrado", "Sem app para baixar"];

const defaultComparisonRows = [
  { label: "Comissão por venda", marketplace: "12% a 27%", trendfood: "0%", badge: "Grátis" },
  { label: "Dados dos clientes", marketplace: "Ficam com a plataforma", trendfood: "São seus" },
  { label: "Cardápio", marketplace: "Padronizado", trendfood: "Personalizado" },
  { label: "Delivery", marketplace: "Motoboy da plataforma (caro)", trendfood: "Seus motoboys, suas regras" },
  { label: "Impressão de pedidos", marketplace: "Não tem", trendfood: "Impressora térmica integrada", badge: "Incluso" },
  { label: "Controle de caixa", marketplace: "Não tem", trendfood: "Completo com abertura/fechamento", badge: "Incluso" },
  { label: "Custo mensal", marketplace: "Comissão variável", trendfood: "A partir de R$ 0/mês", badge: "Grátis" },
];

/* ── Icon map for features ── */
const featureIconMap: Record<string, React.ReactNode> = {
  "Catálogo Digital": <UtensilsCrossed className="w-5 h-5" />,
  "Pedidos por QR Code": <QrCode className="w-5 h-5" />,
  "Painel de Produção (KDS)": <Flame className="w-5 h-5" />,
  "Painel do Atendente": <BellRing className="w-5 h-5" />,
  "Controle de Caixa": <Wallet className="w-5 h-5" />,
  "Mais Vendidos": <BarChart2 className="w-5 h-5" />,
  "Cupons de Desconto": <Tag className="w-5 h-5" />,
  "Faturamento em Tempo Real": <TrendingUp className="w-5 h-5" />,
  "Impressora Térmica": <Printer className="w-5 h-5" />,
  "Gestão de Motoboys": <Bike className="w-5 h-5" />,
  "Gestão de Insumos": <Package className="w-5 h-5" />,
  "Precificação Inteligente": <BarChart3 className="w-5 h-5" />,
};

const stepIcons = [
  <UtensilsCrossed className="w-6 h-6" />,
  <QrCode className="w-6 h-6" />,
  <Flame className="w-6 h-6" />,
  <BarChart3 className="w-6 h-6" />,
];

const benefitIcons = [
  <Smartphone className="w-7 h-7" />,
  <Package className="w-7 h-7" />,
  <CreditCard className="w-7 h-7" />,
];

const formatPrice = (cents: number) => {
  if (cents === 0) return "Grátis";
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
};

interface PlanRow {
  id: string; name: string; key: string; description: string | null;
  price_cents: number; annual_price_cents: number | null; quarterly_price_cents: number | null;
  features: string[]; highlighted: boolean; badge: string | null;
  checkout_url: string | null; sort_order: number; active: boolean;
}

const Index = () => {
  const { content: cms } = usePlatformContent();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedBilling, setSelectedBilling] = useState<"monthly" | "quarterly" | "annual">("monthly");
  const [orderCount, setOrderCount] = useState(0);
  const [displayCount, setDisplayCount] = useState(0);

  const c = (key: string, fallback: string) => (typeof cms[key] === "string" ? cms[key] : fallback);
  const cArr = (key: string, fallback: any[]) => (Array.isArray(cms[key]) ? cms[key] : fallback);

  useEffect(() => {
    supabase.from("platform_plans").select("*").eq("active", true).order("sort_order")
      .then(({ data }) => { setPlans((data as unknown as PlanRow[]) ?? []); setLoadingPlans(false); });

    supabase.rpc('get_total_order_count')
      .then(({ data }) => { if (data) setOrderCount(Number(data)); });

    const channel = supabase.channel("landing-orders")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, () => { setOrderCount((prev) => prev + 1); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (orderCount === 0) return;
    const duration = 1500;
    const start = performance.now();
    const from = displayCount;
    const to = orderCount;
    let raf: number;
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayCount(Math.round(from + (to - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [orderCount]);

  const problemsData = cArr("problems_cards", defaultProblems);
  const benefitsData = cArr("benefit_cards", defaultBenefitCards);
  const stepsData = cArr("steps_cards", defaultSteps);
  const featuresData = cArr("features_cards", defaultFeatures);
  const comparisonData = cArr("comparison_rows", defaultComparisonRows);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-screen flex flex-col">
        <img
          src={c("hero_image_url", "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1920&q=80")}
          alt="Ambiente comercial"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(10,8,6,0.93) 0%, rgba(15,10,5,0.82) 45%, rgba(10,8,6,0.55) 100%)" }} />

        <header className="relative z-10 border-b border-white/[0.06]">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between backdrop-blur-md bg-white/[0.03] rounded-b-2xl">
            <div className="flex items-center gap-2.5">
              <img src="/pwa-192.png" alt="TrendFood" className="w-8 h-8 rounded-lg object-contain" />
              <span className="font-bold text-white text-lg tracking-tight">TrendFood</span>
            </div>
            <div className="hidden md:flex items-center gap-6 mr-auto ml-10">
              <a href="#funcionalidades" className="text-white/60 hover:text-white text-sm font-medium transition-colors">Recursos</a>
              <Link to="/planos" className="text-white/60 hover:text-white text-sm font-medium transition-colors">Preços</Link>
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/[0.06] transition-all" asChild>
                <Link to="/auth">Entrar</Link>
              </Button>
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5 transition-all" asChild>
                <Link to="/auth">Começar Agora</Link>
              </Button>
            </div>
          </div>
        </header>

        <div className="relative z-10 flex-1 flex items-center">
          <div className="max-w-5xl mx-auto px-4 py-24 text-center w-full">
            <Badge className="mb-8 bg-white/[0.08] text-white/80 border-white/[0.1] hover:bg-white/[0.12] backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium">
              <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              {c("hero_badge_text", "Zero taxas sobre vendas")}
            </Badge>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-[1.1] tracking-tight">
              {c("hero_title", "O Cardápio Digital que Profissionaliza seu Delivery")}
              <br />
              <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 bg-clip-text text-transparent">
                {c("hero_title_highlight", "Sem Taxas, Com Gestão Real.")}
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/75 max-w-2xl mx-auto mb-4 leading-[1.8]">
              {c("hero_subtitle", "Diferente dos marketplaces, aqui o dinheiro fica todo com você. Catálogo digital, entregas com seus motoboys, impressão térmica e controle de caixa — sem pagar 27% pra ninguém.")}
            </p>
            <p className="text-sm md:text-base text-white/45 max-w-xl mx-auto mb-12 leading-relaxed">
              {c("hero_subtitle2", "Comece grátis em menos de 2 minutos. Seu negócio mais organizado a partir de hoje.")}
            </p>

            <div className="flex justify-center">
              <Link to="/auth" className="inline-flex items-center gap-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-lg font-bold px-10 py-4 rounded-full shadow-[0_8px_32px_rgba(249,115,22,0.5)] hover:shadow-[0_12px_40px_rgba(249,115,22,0.6)] hover:scale-[1.03] transition-all duration-300">
                {c("hero_cta_text", "Começar Grátis")}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="mt-14 flex flex-wrap gap-2.5 justify-center">
              {cArr("proof_badges", defaultProofBadges).map((b: string) => (
                <span key={b} className="px-4 py-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 text-white/80 text-sm font-medium">{b}</span>
              ))}
            </div>

            {orderCount > 0 && (
              <div className="mt-8 flex justify-center animate-fade-in">
                <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-orange-500/15 border border-orange-400/30 text-orange-300 text-sm font-semibold tracking-wide">
                  <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
                  +{displayCount.toLocaleString('pt-BR')} {c("order_counter_text", "pedidos feitos no TrendFood")}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Benefit Cards */}
      <section className="py-16 px-4 bg-background border-b border-border/60">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {benefitsData.map((card: any, idx: number) => (
              <div key={card.title} className="bg-card rounded-2xl p-6 border border-border hover:border-primary/40 hover:shadow-lg transition-all text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                  {benefitIcons[idx] || <Zap className="w-7 h-7" />}
                </div>
                <h3 className="font-bold text-foreground text-lg mb-2">{card.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section id="problemas" className="py-20 px-4 bg-background">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">O problema real</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">{c("problems_title", "Você já passou por isso?")}</h2>
            <p className="text-muted-foreground text-lg">{c("problems_subtitle", "Esses problemas custam dinheiro e clientes todo dia")}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {problemsData.map((p: any) => (
              <div key={p.title} className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:border-primary/30 hover:shadow-md transition-all">
                <div className="h-44 overflow-hidden">
                  <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-foreground text-lg mb-2">{p.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{p.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <p className="text-lg font-semibold text-foreground">
              A TrendFood resolve tudo isso. <span className="text-primary">Veja como 👇</span>
            </p>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <ComparisonSection rows={comparisonData} />

      <SavingsCalculator />

      {/* How it works */}
      <section id="como-funciona" className="bg-secondary/40 border-y border-border/60 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Como funciona</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Quatro passos simples</h2>
            <p className="text-muted-foreground text-lg">Do cardápio ao fechamento do caixa, tudo integrado</p>
          </div>
          <div className="grid md:grid-cols-4 gap-4 md:gap-0 items-start">
            {stepsData.map((step: any, idx: number) => (
              <div key={step.title} className="flex md:contents">
                <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      {stepIcons[idx] || <Zap className="w-6 h-6" />}
                    </div>
                    <span className="text-4xl font-black text-border">{String(idx + 1).padStart(2, "0")}</span>
                  </div>
                  <h3 className="font-bold text-foreground text-base mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                </div>
                {idx < stepsData.length - 1 && (
                  <div className="hidden md:flex items-center justify-center px-1 self-center">
                    <ChevronRight className="w-5 h-5 text-primary" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <ShowcaseSection />

      {/* Features */}
      <section id="funcionalidades" className="py-20 px-4 bg-background">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Tudo em um só lugar</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Funcionalidades completas</h2>
            <p className="text-muted-foreground text-lg">Do cardápio digital ao controle de caixa — sem precisar de vários sistemas</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {featuresData.map((f: any) => (
              <div key={f.title} className="group bg-card rounded-2xl p-5 border border-border hover:border-primary/40 hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {featureIconMap[f.title] || <Zap className="w-5 h-5" />}
                </div>
                <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section id="planos" className="py-20 px-4 bg-secondary/40 border-y border-border/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Planos</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Escolha o plano ideal para seu negócio</h2>
            <p className="text-muted-foreground text-lg">Comece grátis e evolua conforme sua operação cresce</p>
          </div>
          <div className="flex items-center justify-center gap-1 bg-muted rounded-xl p-1 w-fit mx-auto mb-8">
            {([
              { key: "monthly" as const, label: "Mensal" },
              { key: "quarterly" as const, label: "Trimestral", badge: "-10%" },
              { key: "annual" as const, label: "Anual", badge: "-17%" },
            ]).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSelectedBilling(opt.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedBilling === opt.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
                {opt.badge && <span className="ml-1 text-xs font-bold">{opt.badge}</span>}
              </button>
            ))}
          </div>
          {loadingPlans ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6 items-stretch">
              {plans.map((plan) => {
                const isQuarterly = selectedBilling === "quarterly" && (plan.quarterly_price_cents ?? 0) > 0;
                const isAnnual = selectedBilling === "annual" && (plan.annual_price_cents ?? 0) > 0;
                const displayPrice = isAnnual
                  ? formatPrice(plan.annual_price_cents!)
                  : isQuarterly
                    ? formatPrice(plan.quarterly_price_cents!)
                    : formatPrice(plan.price_cents);
                const period = isAnnual ? "/ano" : isQuarterly ? "/trim" : "/mês";
                const subtitle = isAnnual
                  ? `Equivalente a R$ ${((plan.annual_price_cents! / 12) / 100).toFixed(2).replace(".", ",")}/mês`
                  : isQuarterly
                    ? `Equivalente a R$ ${((plan.quarterly_price_cents! / 3) / 100).toFixed(2).replace(".", ",")}/mês`
                    : undefined;
                const savingsBadge = isAnnual ? "ECONOMIA DE 17%" : isQuarterly ? "ECONOMIA DE 10%" : undefined;
                return (
                  <PlanCard key={plan.id} name={plan.name} price={displayPrice} period={period} subtitle={subtitle} savingsBadge={savingsBadge}
                    description={plan.description ?? ""} features={Array.isArray(plan.features) ? plan.features : []}
                    cta="Ver detalhes" ctaLink="/planos" highlighted={plan.highlighted} badge={plan.badge ?? undefined}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA final */}
      <section className="relative overflow-hidden py-24 px-4" style={{ background: "linear-gradient(135deg, #1a1410 0%, #2d1f15 50%, #1a1410 100%)" }}>
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
            {c("cta_title", "Pare de pagar comissão. Comece hoje.")}
          </h2>
          <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto">
            {c("cta_subtitle", "Mesmo sistema, zero taxa. Configure em minutos e veja a diferença no seu caixa.")}
          </p>
          <Button size="lg" className="text-base font-bold gap-2 bg-white text-primary hover:bg-white/90 shadow-xl" asChild>
            <Link to="/auth">
              {c("cta_button_text", "Começar Grátis Agora")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <p className="mt-4 text-white/40 text-sm">Sem cartão de crédito · Cancele quando quiser</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-muted/50 pt-14 pb-8 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-3">
              <img src="/pwa-192.png" alt="TrendFood" className="w-7 h-7 rounded-md object-contain" />
              <span className="font-bold text-foreground text-lg tracking-tight">TrendFood</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              {c("footer_description", "Sistema completo para seu negócio de alimentação. Zero taxas, zero comissão.")}
            </p>
            <div className="flex items-center gap-3">
              <a href={c("footer_instagram_url", "https://www.instagram.com/_trend.food")} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href={c("footer_whatsapp_url", "http://wa.me/message/H632HC5C5XX5C1")} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-3">Produto</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#funcionalidades" className="text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</a></li>
              <li><Link to="/planos" className="text-muted-foreground hover:text-foreground transition-colors">Planos</Link></li>
              <li><a href="#como-funciona" className="text-muted-foreground hover:text-foreground transition-colors">Como Funciona</a></li>
              <li><a href="#calculadora" className="text-muted-foreground hover:text-foreground transition-colors">Calculadora de Economia</a></li>
              <li><a href="#comparativo" className="text-muted-foreground hover:text-foreground transition-colors">Comparativo</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-3">Suporte</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/termos" className="text-muted-foreground hover:text-foreground transition-colors">Termos de Uso</Link></li>
              <li><Link to="/privacidade" className="text-muted-foreground hover:text-foreground transition-colors">Política de Privacidade</Link></li>
              <li><a href={c("footer_whatsapp_url", "http://wa.me/message/H632HC5C5XX5C1")} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">WhatsApp</a></li>
              <li><a href="#problemas" className="text-muted-foreground hover:text-foreground transition-colors">Perguntas Frequentes</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-3">Contato</h4>
            <ul className="space-y-2 text-sm">
              <li><a href={`mailto:${c("footer_email", "contato@trendfood.com.br")}`} className="text-muted-foreground hover:text-foreground transition-colors">{c("footer_email", "contato@trendfood.com.br")}</a></li>
              <li>
                <a href={c("footer_whatsapp_url", "http://wa.me/message/H632HC5C5XX5C1")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                  <MessageCircle className="w-4 h-4" /> Fale conosco
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-5xl mx-auto border-t border-border/60 pt-6 text-center text-muted-foreground text-sm space-y-1">
          <p>{c("footer_copyright", "TrendFood © 2026 - Todos os direitos reservados")}</p>
          <p className="text-xs">CNPJ 66.067.207/0001-91 — JACKSON BRENO FRANCELINO DA COSTA</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link to="/termos" className="hover:text-foreground transition-colors">Termos de Uso</Link>
            <Link to="/privacidade" className="hover:text-foreground transition-colors">Política de Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
