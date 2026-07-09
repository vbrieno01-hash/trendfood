import { useState, useEffect, lazy, Suspense } from "react";
import { usePlatformContent } from "@/hooks/usePlatformContent";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import HeroCinematic from "@/components/landing/HeroCinematic";
import HeroOfferBanner from "@/components/landing/HeroOfferBanner";
const SavingsCalculator = lazy(() => import("@/components/landing/SavingsCalculator"));
const TopStoresMarquee = lazy(() => import("@/components/landing/TopStoresMarquee"));
const StackedProblemCards = lazy(() => import("@/components/landing/StackedProblemCards"));
const TimelineSteps = lazy(() => import("@/components/landing/TimelineSteps"));
const StickyShowcase = lazy(() => import("@/components/landing/StickyShowcase"));
const AnimatedComparison = lazy(() => import("@/components/landing/AnimatedComparison"));
const MagneticFeatureCard = lazy(() => import("@/components/landing/MagneticFeatureCard"));
import PlanCard from "@/components/pricing/PlanCard";
import { supabase } from "@/integrations/supabase/client";
import PageSeo from "@/components/seo/PageSeo";
import { Helmet } from "react-helmet-async";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import {
  BarChart3, Zap, ArrowRight, QrCode, UtensilsCrossed, TrendingUp,
  Flame, BellRing, Wallet, Tag, Printer, BarChart2,
  Bike, MessageCircle, Instagram, Smartphone, Package, CreditCard, Loader2, Star, CheckCircle2,
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

const defaultTestimonials = [
  { name: "Rafael Almeida", role: "Pizzaria — São Paulo/SP", quote: "Saí do iFood e em 2 semanas já tinha meus clientes pedindo direto pelo WhatsApp. Economizei R$ 3.200 só no primeiro mês em comissão." },
  { name: "Juliana Souza", role: "Hamburgueria — Belo Horizonte/MG", quote: "O QR Code na mesa foi um divisor de águas. Meus atendentes só entregam — o cliente pede sozinho. Giro dobrou no fim de semana." },
  { name: "Diego Ribeiro", role: "Açaiteria — Recife/PE", quote: "Impressão térmica automática, PIX no recibo e controle de caixa completo. Substituiu 3 sistemas que eu pagava separado." },
];

const defaultFaqs = [
  { q: "Quanto custa um cardápio digital?", a: "No TrendFood você começa 100% grátis, sem cartão de crédito. O plano Free já inclui cardápio digital ilimitado, QR Code, pedidos pelo WhatsApp e recebimento por PIX. Planos pagos a partir de R$ 0/mês desbloqueiam recursos avançados como KDS, motoboys e relatórios." },
  { q: "Preciso baixar algum app para usar?", a: "Não. O TrendFood é 100% web — funciona no navegador do celular, tablet ou computador. Seus clientes também não precisam baixar nada: escaneiam o QR Code ou abrem o link do cardápio direto no WhatsApp." },
  { q: "O TrendFood cobra taxa por pedido como o iFood?", a: "Não. Zero comissão, zero taxa por pedido. Você paga apenas a mensalidade do plano escolhido (ou usa o Free) e fica com 100% do valor de cada venda. Enquanto o iFood cobra até 27% por pedido, aqui o lucro é todo seu." },
  { q: "Funciona para delivery e para atendimento em mesa/balcão?", a: "Sim. O TrendFood é multi-modo: delivery com motoboys próprios, atendimento em mesa via QR Code, pedidos no balcão (PDV), e venda direta pelo WhatsApp. Tudo no mesmo painel, com KDS de cozinha integrado." },
  { q: "Aceita pagamento por PIX automático?", a: "Sim. O TrendFood tem PIX integrado via Mercado Pago (conta CNPJ). O QR Code do PIX é impresso automaticamente no recibo térmico e o pagamento é confirmado em tempo real, sem maquininha." },
  { q: "Consigo migrar do iFood sem perder clientes?", a: "Sim. Você exporta seu cardápio, cria o QR Code do TrendFood e distribui via Instagram, WhatsApp e adesivo na embalagem. A maioria dos restaurantes migra em menos de 1 semana e mantém os clientes ativos com o programa de fidelidade nativo do TrendFood." },
];

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
  return `R$ ${(cents / 100).toFixed(0)}`;
};

interface PlanRow {
  id: string; name: string; key: string; description: string | null;
  price_cents: number; annual_price_cents: number | null; quarterly_price_cents: number | null;
  features: string[]; highlighted: boolean; badge: string | null;
  checkout_url: string | null; sort_order: number; active: boolean;
}

const Index = () => {
  const { content: cms, loading: cmsLoading } = usePlatformContent();
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
  const testimonialsData = cArr("testimonials_cards", defaultTestimonials);
  const faqsData = cArr("faq_items", defaultFaqs);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqsData.map((f: any) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="landing-cream min-h-screen bg-cream text-ink">
      <PageSeo
        title="TrendFood — Cardápio Digital e Delivery com Taxa 0%"
        description="TrendFood é o cardápio digital e sistema de delivery com taxa 0% para restaurantes. Receba pedidos no WhatsApp, gerencie cozinha e aumente seu lucro real."
        path="/"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>
      {/* Banner de oferta + urgência */}
      <HeroOfferBanner />

      {/* Hero Cinematic */}
      <HeroCinematic
        badgeText={c("hero_badge_text", "Zero taxas sobre vendas")}
        title={c("hero_title", "O Cardápio Digital que Profissionaliza seu Delivery")}
        titleHighlight={c("hero_title_highlight", "Sem Taxas, Com Gestão Real.")}
        subtitle={c("hero_subtitle", "Diferente dos marketplaces, aqui o dinheiro fica todo com você. Catálogo digital, entregas com seus motoboys, impressão térmica e controle de caixa — sem pagar 27% pra ninguém.")}
        subtitle2={c("hero_subtitle2", "Comece grátis em menos de 2 minutos. Seu negócio mais organizado a partir de hoje.")}
        ctaText={c("hero_cta_text", "Começar Grátis")}
        proofBadges={cArr("proof_badges", defaultProofBadges)}
        orderCount={orderCount}
        displayCount={displayCount}
        orderCounterText={c("order_counter_text", "pedidos feitos no TrendFood")}
        heroImageUrl={cmsLoading ? "" : c("hero_image_url", "")}
      />

      {/* Selo de risco zero abaixo do hero */}
      <div className="px-4 -mt-2 md:-mt-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs md:text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Grátis para começar</span>
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Sem cartão de crédito</span>
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Pronto em 2 minutos</span>
          <Link to="/planos" className="underline underline-offset-4 hover:text-foreground">Ver todos os planos</Link>
        </div>
      </div>

      {/* Carrossel automático das top 15 lojas */}
      <Suspense fallback={null}>
        <TopStoresMarquee />
      </Suspense>

      {/* Benefit Cards */}
      <section className="py-12 md:py-20 px-4 bg-cream">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            {benefitsData.map((card: any, idx: number) => (
              <div
                key={card.title}
                className="group relative paper-card p-7 hover:-translate-y-1 transition-transform overflow-hidden"
              >
                <span className="absolute top-4 right-5 font-display font-bold text-5xl text-accent/15 tabular-nums leading-none select-none">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div className="w-14 h-14 rounded-2xl bg-accent-solid flex items-center justify-center mb-5 shadow-[0_10px_24px_-10px_hsl(24_95%_45%/0.55)]">
                  {benefitIcons[idx] || <Zap className="w-7 h-7" />}
                </div>
                <h3 className="font-display font-bold text-ink text-xl mb-2 tracking-tight">{card.title}</h3>
                <p className="text-ink-muted text-sm leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Suspense fallback={null}>
        {/* Problems with stacked 3D cards */}
        <StackedProblemCards
          title={c("problems_title", "Você já passou por isso?")}
          subtitle={c("problems_subtitle", "Esses problemas custam dinheiro e clientes todo dia")}
          problems={problemsData as any}
        />

        {/* Animated comparison */}
        <AnimatedComparison rows={comparisonData as any} />

        <SavingsCalculator />

        {/* Timeline-style steps */}
        <TimelineSteps steps={stepsData as any} />

        {/* Sticky scroll showcase */}
        <StickyShowcase />
      </Suspense>

      {/* Depoimentos de clientes */}
      <section className="relative py-14 md:py-24 px-4 bg-cream-surface overflow-hidden">
        <span aria-hidden className="watermark-text left-1/2 -translate-x-1/2 top-4">DEPOIMENTOS</span>
        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="hairline-accent mx-auto mb-5" />
            <h2 className="font-display font-bold text-4xl md:text-5xl text-ink mb-3 tracking-tight">
              Saíram do iFood.<br className="hidden md:block" /> <span className="text-accent">Não voltam mais.</span>
            </h2>
            <p className="text-ink-muted text-lg">Histórias reais de quem trocou comissão por lucro</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {testimonialsData.map((t: any) => (
              <figure key={t.name} className="relative paper-card p-7 flex flex-col">
                <span className="absolute -top-4 left-6 font-display font-bold text-6xl text-accent leading-none select-none">"</span>
                <div className="flex gap-0.5 mb-4 text-accent mt-2">
                  {[0,1,2,3,4].map((i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                </div>
                <blockquote className="text-ink text-[15px] leading-relaxed flex-1 font-medium">{t.quote}</blockquote>
                <figcaption className="mt-5 pt-4 border-t border-cream">
                  <div className="font-display font-bold text-ink text-sm">{t.name}</div>
                  <div className="text-ink-muted text-xs mt-0.5">{t.role}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" className="relative py-14 md:py-24 px-4 bg-cream overflow-hidden">
        <span aria-hidden className="watermark-text right-[-2rem] top-6">TRENDFOOD</span>
        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="hairline-accent mx-auto mb-5" />
            <h2 className="font-display font-bold text-4xl md:text-5xl text-ink mb-3 tracking-tight">
              Tudo o que seu delivery precisa.<br className="hidden md:block" />
              <span className="text-accent">Num sistema só.</span>
            </h2>
            <p className="text-ink-muted text-lg">Do cardápio digital ao controle de caixa — sem juntar 4 apps diferentes</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 perspective-[1200px]" style={{ perspective: 1200 }}>
            <Suspense fallback={null}>
              {featuresData.map((f: any, i: number) => (
                <MagneticFeatureCard
                  key={f.title}
                  title={f.title}
                  description={f.description}
                  icon={featureIconMap[f.title] || <Zap className="w-5 h-5" />}
                  index={i}
                />
              ))}
            </Suspense>
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section id="planos" className="py-14 md:py-24 px-4 bg-cream-surface">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="hairline-accent mx-auto mb-5" />
            <h2 className="font-display font-bold text-4xl md:text-5xl text-ink mb-3 tracking-tight">Escolha o plano ideal</h2>
            <p className="text-ink-muted text-lg">Comece grátis e evolua conforme sua operação cresce</p>
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
                const period = isAnnual ? "/ano" : isQuarterly ? "/tri" : "/mês";
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

      {/* FAQ */}
      <section id="faq" className="py-14 md:py-24 px-4 bg-cream">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="hairline-accent mx-auto mb-5" />
            <h2 className="font-display font-bold text-4xl md:text-5xl text-ink mb-3 tracking-tight">Perguntas frequentes</h2>
            <p className="text-ink-muted">Ainda em dúvida? Fale com a gente no WhatsApp.</p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqsData.map((f: any, i: number) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-base md:text-lg font-display font-bold text-ink hover:text-accent [&[data-state=open]]:text-accent">{f.q}</AccordionTrigger>
                <AccordionContent className="text-ink-muted leading-relaxed text-[15px]">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <p className="mt-8 text-center text-sm text-ink-muted">
            Novo por aqui? Veja também{" "}
            <Link to="/cardapio-digital-whatsapp" className="text-accent hover:underline font-semibold">Como fazer cardápio digital para WhatsApp</Link>
            {" "}ou{" "}
            <Link to="/indique" className="text-accent hover:underline font-semibold">Indique e ganhe</Link>.
          </p>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative overflow-hidden py-16 md:py-28 px-4 bg-accent-solid">
        <span aria-hidden className="watermark-text left-1/2 -translate-x-1/2 top-2" style={{ color: "hsl(var(--landing-ink) / 0.08)" }}>
          COMECE HOJE
        </span>
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="font-display font-bold text-4xl md:text-6xl text-ink mb-5 leading-[0.95] tracking-tight">
            {c("cta_title", "Pare de pagar comissão. Comece hoje.")}
          </h2>
          <p className="text-ink/75 text-lg md:text-xl mb-9 max-w-xl mx-auto">
            {c("cta_subtitle", "Mesmo sistema, zero taxa. Configure em minutos e veja a diferença no seu caixa.")}
          </p>
          <Button size="lg" className="text-base font-bold gap-2 bg-white text-ink hover:bg-white/95 shadow-[0_20px_50px_-15px_hsl(20_33%_9%/0.4)] rounded-full h-14 px-8" asChild>
            <Link to="/auth">
              {c("cta_button_text", "Começar Grátis Agora")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-ink/85 text-sm font-medium">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Grátis para começar</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Sem cartão de crédito</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Setup em 2 minutos</span>
          </div>
          <p className="mt-5 text-ink/70 text-sm">
            <Link to="/planos" className="underline underline-offset-4 hover:text-ink font-medium">Ver todos os planos</Link>
            {" · "}Cancele quando quiser
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-cream bg-ink pt-14 pb-8 px-4 text-[hsl(var(--landing-bg))]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-3">
              <img src="/pwa-192.png" alt="TrendFood" className="w-7 h-7 rounded-md object-contain" />
              <span className="font-display font-bold text-white text-lg tracking-tight">TrendFood</span>
            </div>
            <p className="text-white/60 text-sm leading-relaxed mb-4">
              {c("footer_description", "Sistema completo para seu negócio de alimentação. Zero taxas, zero comissão.")}
            </p>
            <div className="flex items-center gap-3">
              <a href={c("footer_instagram_url", "https://www.instagram.com/_trend.food")} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-accent transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href={c("footer_whatsapp_url", "http://wa.me/message/H632HC5C5XX5C1")} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-accent transition-colors">
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-display font-bold text-white text-sm mb-3 tracking-wide uppercase">Produto</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#funcionalidades" className="text-white/60 hover:text-white transition-colors">Funcionalidades</a></li>
              <li><Link to="/planos" className="text-white/60 hover:text-white transition-colors">Planos</Link></li>
              <li><Link to="/cardapio-digital-whatsapp" className="text-white/60 hover:text-white transition-colors">Cardápio digital WhatsApp</Link></li>
              <li><Link to="/indique" className="text-white/60 hover:text-white transition-colors">Indique e ganhe</Link></li>
              <li><a href="#como-funciona" className="text-white/60 hover:text-white transition-colors">Como Funciona</a></li>
              <li><a href="#calculadora" className="text-white/60 hover:text-white transition-colors">Calculadora de Economia</a></li>
              <li><a href="#comparativo" className="text-white/60 hover:text-white transition-colors">Comparativo</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-bold text-white text-sm mb-3 tracking-wide uppercase">Suporte</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/termos" className="text-white/60 hover:text-white transition-colors">Termos de Uso</Link></li>
              <li><Link to="/privacidade" className="text-white/60 hover:text-white transition-colors">Política de Privacidade</Link></li>
              <li><a href={c("footer_whatsapp_url", "http://wa.me/message/H632HC5C5XX5C1")} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors">WhatsApp</a></li>
              <li><a href="#problemas" className="text-white/60 hover:text-white transition-colors">Problemas Comuns</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-bold text-white text-sm mb-3 tracking-wide uppercase">Contato</h4>
            <ul className="space-y-2 text-sm">
              <li><a href={`mailto:${c("footer_email", "contato@trendfood.com.br")}`} className="text-white/60 hover:text-white transition-colors">{c("footer_email", "contato@trendfood.com.br")}</a></li>
              <li>
                <a href={c("footer_whatsapp_url", "http://wa.me/message/H632HC5C5XX5C1")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-white/60 hover:text-white transition-colors">
                  <MessageCircle className="w-4 h-4" /> Fale conosco
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-5xl mx-auto border-t border-white/10 pt-6 text-center text-white/60 text-sm space-y-1">
          <p>{c("footer_copyright", "TrendFood © 2026 - Todos os direitos reservados")}</p>
          <p className="text-xs">CNPJ 66.067.207/0001-91</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link to="/termos" className="hover:text-white transition-colors">Termos de Uso</Link>
            <Link to="/privacidade" className="hover:text-white transition-colors">Política de Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
