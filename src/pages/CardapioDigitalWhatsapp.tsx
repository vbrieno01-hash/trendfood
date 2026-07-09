import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import PageSeo from "@/components/seo/PageSeo";
import {
  MessageCircle, Check, X, ArrowRight, Zap, ShieldCheck, Sparkles,
  UserPlus, Package, Palette, Link2, Bell,
  QrCode, Truck, CreditCard, ChefHat, BarChart3, Utensils,
} from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";

const STEPS = [
  {
    icon: UserPlus,
    title: "Crie sua conta grátis",
    desc: "Cadastro em 30 segundos com e-mail ou Google. Sem cartão, sem período de teste enganoso.",
  },
  {
    icon: Package,
    title: "Cadastre seus produtos",
    desc: "Adicione fotos, preços, categorias e complementos. Copie do seu cardápio antigo ou monte na hora.",
  },
  {
    icon: Palette,
    title: "Personalize sua loja",
    desc: "Escolha cores, logo e horário de funcionamento. Sua página fica com a cara do seu restaurante.",
  },
  {
    icon: Link2,
    title: "Coloque o link no WhatsApp",
    desc: "Copie o link do seu cardápio digital e cole na descrição do WhatsApp Business, Instagram e status.",
  },
  {
    icon: Bell,
    title: "Receba pedidos direto",
    desc: "O cliente pede pelo link, escolhe pagar por PIX, cartão ou na entrega — e o pedido cai no WhatsApp.",
  },
];

const COMPARISON = [
  { feature: "Atualização de preço em tempo real", pdf: false, canva: false, tf: true },
  { feature: "Cliente faz o pedido sozinho", pdf: false, canva: false, tf: true },
  { feature: "Controle de estoque", pdf: false, canva: false, tf: true },
  { feature: "Aceita PIX e cartão", pdf: false, canva: false, tf: true },
  { feature: "Impressão automática na cozinha", pdf: false, canva: false, tf: true },
  { feature: "Taxa por pedido", pdf: "—", canva: "—", tf: "0%" },
];

const FEATURES = [
  { icon: Utensils, title: "Cardápio digital completo", desc: "Categorias, fotos, complementos e opcionais em uma página rápida e responsiva." },
  { icon: Truck, title: "Delivery próprio", desc: "Bairros, taxas por região e integração com motoboys. Zero comissão por entrega." },
  { icon: QrCode, title: "Mesa com QR Code", desc: "Cliente escaneia, pede pelo celular e o pedido vai direto pra cozinha." },
  { icon: CreditCard, title: "PDV integrado", desc: "Venda no balcão, fechamento de caixa e relatórios num só sistema." },
  { icon: ChefHat, title: "Cozinha (KDS)", desc: "Pedidos organizados em telas por status: aguardando, preparando, pronto." },
  { icon: BarChart3, title: "Relatórios de verdade", desc: "Vendas por dia, produto mais vendido, ticket médio e lucro por período." },
];

const FAQ = [
  {
    q: "Preciso baixar algum aplicativo?",
    a: "Não. Tanto você quanto seus clientes usam pelo navegador. O TrendFood também tem PWA que instala como app no celular sem precisar da Play Store.",
  },
  {
    q: "É grátis mesmo? Qual a pegadinha?",
    a: "É grátis de verdade. O plano Free permite receber pedidos ilimitados pelo cardápio, com PIX e checkout. Você só paga se quiser recursos avançados (KDS, motoboys, múltiplas unidades) — mas nunca pagamos comissão por pedido, diferente do iFood.",
  },
  {
    q: "Como o cliente faz o pedido pelo WhatsApp?",
    a: "O cliente abre seu link (você compartilha por WhatsApp, Instagram ou status), navega no cardápio, adiciona itens ao carrinho, escolhe entrega ou retirada, paga por PIX/cartão/dinheiro e o pedido chega automático no WhatsApp e no painel do restaurante.",
  },
  {
    q: "Funciona sem WhatsApp Business?",
    a: "Sim. Funciona no WhatsApp comum também. Mas o Business é mais indicado porque permite catálogo, respostas rápidas e horário de atendimento — combinação perfeita com o TrendFood.",
  },
  {
    q: "Vocês cobram taxa por pedido, como o iFood?",
    a: "Zero. O TrendFood não fica com nenhum percentual das suas vendas. Se você faz R$ 30.000 no mês, você recebe R$ 30.000. Só existe a mensalidade fixa do plano que você escolher (o Free custa R$ 0).",
  },
  {
    q: "Consigo aceitar PIX e cartão automaticamente?",
    a: "Sim. O PIX já vem integrado (gera QR Code na hora do pedido) e o cartão é feito via Mercado Pago com CNPJ próprio ou da plataforma. O cliente paga direto pelo cardápio, sem trocar mensagem.",
  },
];

export default function CardapioDigitalWhatsappPage() {
  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Como fazer cardápio digital para WhatsApp grátis",
    description:
      "Guia passo a passo para criar um cardápio digital gratuito e receber pedidos direto pelo WhatsApp com o TrendFood.",
    totalTime: "PT5M",
    step: STEPS.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: s.desc,
    })),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageSeo
        title="Cardápio Digital para WhatsApp Grátis | Como Fazer em 5 Minutos"
        description="Crie um cardápio digital grátis para o WhatsApp em 5 minutos. Receba pedidos por PIX e cartão sem taxa, sem app. Passo a passo completo."
        path="/cardapio-digital-whatsapp"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(howToJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      {/* Header */}
      <header className="border-b border-border/60 backdrop-blur-sm sticky top-0 z-10 bg-background/80">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoIcon} alt="TrendFood" className="w-8 h-8" />
            <span className="font-bold text-lg">TrendFood</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/planos" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">
              Planos
            </Link>
            <Button asChild size="sm">
              <Link to="/auth">Entrar</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 py-14 sm:py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-4 py-1.5 text-xs font-semibold mb-6">
          <MessageCircle className="w-3.5 h-3.5" />
          Cardápio digital + WhatsApp
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
          Como fazer <span className="text-primary">cardápio digital</span> para WhatsApp grátis
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Monte seu cardápio online em 5 minutos, cole o link no WhatsApp e comece a receber
          pedidos com PIX e cartão. Sem taxa por pedido, sem app pra baixar, sem contrato.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600" /> Sem taxa por pedido</span>
          <span className="inline-flex items-center gap-1.5"><Zap className="w-4 h-4 text-primary" /> Setup em 5 minutos</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Sem cartão de crédito</span>
        </div>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link to="/cadastro">
              Criar meu cardápio grátis
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/planos">Ver planos e preços</Link>
          </Button>
        </div>
      </section>

      {/* Tutorial 5 passos */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Como criar seu cardápio digital para WhatsApp em 5 passos
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Passo a passo completo, do zero até o primeiro pedido no seu WhatsApp.
          </p>
        </div>
        <ol className="space-y-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <li
                key={s.title}
                className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6"
              >
                <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                  {i + 1}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-lg">{s.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="mt-8 text-center">
          <Button asChild size="lg" className="gap-2">
            <Link to="/cadastro">
              Começar o passo 1 agora
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Comparativo */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Por que não usar só PDF ou imagem no Canva?
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Cardápio em PDF ou foto até funciona — mas o cliente ainda precisa te chamar,
            digitar o pedido e você anotar. Isso significa erro, demora e vendas perdidas.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left font-semibold p-4">Recurso</th>
                  <th className="text-center font-semibold p-4">PDF</th>
                  <th className="text-center font-semibold p-4">Canva / Imagem</th>
                  <th className="text-center font-semibold p-4 text-primary">TrendFood</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 1 ? "bg-muted/20" : ""}>
                    <td className="p-4 font-medium">{row.feature}</td>
                    {[row.pdf, row.canva, row.tf].map((v, idx) => (
                      <td key={idx} className="p-4 text-center">
                        {v === true ? (
                          <Check className="w-5 h-5 text-emerald-600 mx-auto" />
                        ) : v === false ? (
                          <X className="w-5 h-5 text-muted-foreground/60 mx-auto" />
                        ) : (
                          <span className={idx === 2 ? "font-bold text-primary" : "text-muted-foreground"}>{v}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold">O que vem junto com seu cardápio</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Não é só um cardápio — é o sistema completo pra você rodar seu delivery, mesa e balcão.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-2xl border border-border bg-card p-6 space-y-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Depoimento */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="rounded-3xl bg-muted/30 border border-border p-8 sm:p-12 text-center">
          <Sparkles className="w-10 h-10 text-primary mx-auto mb-4" />
          <blockquote className="text-xl sm:text-2xl font-medium leading-relaxed">
            "Antes eu passava o cardápio em PDF e anotava tudo no papel. Agora o cliente
            monta o pedido sozinho, paga por PIX e cai direto no meu WhatsApp. Zero taxa,
            zero dor de cabeça."
          </blockquote>
          <p className="mt-4 text-sm text-muted-foreground">
            — Depoimento típico de um dono usando o TrendFood
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-10">Perguntas frequentes</h2>
        <div className="space-y-4">
          {FAQ.map(({ q, a }) => (
            <details
              key={q}
              className="group rounded-xl border border-border bg-card p-5 open:shadow-sm"
            >
              <summary className="flex items-center justify-between cursor-pointer font-semibold list-none">
                <span>{q}</span>
                <span className="text-primary transition-transform group-open:rotate-45 text-2xl leading-none">+</span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-10 sm:p-14">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-90" />
          <h2 className="text-3xl sm:text-4xl font-extrabold">
            Pronto para receber pedidos pelo WhatsApp?
          </h2>
          <p className="mt-3 opacity-90 max-w-xl mx-auto">
            Crie sua conta grátis, monte seu cardápio digital em 5 minutos e comece a vender hoje mesmo.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-6 gap-2">
            <Link to="/cadastro">
              Criar meu cardápio grátis
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <p className="mt-3 text-xs opacity-80">Sem cartão de crédito · Sem contrato · Sem taxa</p>
        </div>
      </section>

      {/* Footer mini */}
      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} TrendFood — Cardápio digital taxa 0%</span>
          <div className="flex gap-4">
            <Link to="/indique" className="hover:text-foreground">Indique e ganhe</Link>
            <Link to="/planos" className="hover:text-foreground">Planos</Link>
            <Link to="/termos" className="hover:text-foreground">Termos</Link>
            <Link to="/privacidade" className="hover:text-foreground">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}