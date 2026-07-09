import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import PageSeo from "@/components/seo/PageSeo";
import { Gift, Share2, UserPlus, CreditCard, Check, ArrowRight, Sparkles } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";

const FAQ = [
  {
    q: "Como funciona o programa de indicação do TrendFood?",
    a: "Você compartilha seu link único com outros donos de restaurante. Quando eles se cadastram e assinam um plano pago, você ganha dias grátis somados ao seu plano atual — automaticamente.",
  },
  {
    q: "Quantos dias grátis eu ganho por indicação?",
    a: "+1 mês (30 dias) quando o indicado assinar o Plano Mensal e +3 meses (90 dias) quando ele assinar o Plano Anual. Sem limite de indicações.",
  },
  {
    q: "Meu amigo também ganha algo?",
    a: "Sim. Quem entra pelo seu link também recebe bônus na primeira assinatura, então indicar é vantajoso para os dois lados.",
  },
  {
    q: "Quando o bônus é creditado?",
    a: "O crédito aparece assim que o pagamento do indicado é confirmado pelo gateway. Você acompanha tudo pela aba 'Indique amigos' no seu painel.",
  },
  {
    q: "Precisa pagar alguma coisa para indicar?",
    a: "Não. O programa é gratuito para qualquer conta TrendFood — inclusive contas no plano Free ou em período de teste.",
  },
];

export default function IndiquePage() {
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
        title="Indique e ganhe meses grátis no TrendFood | Programa de Indicação"
        description="Indique outros donos de restaurante para o TrendFood e ganhe até 3 meses grátis por assinatura. Cardápio digital, delivery e PDV com taxa 0%."
        path="/indique"
      />
      <Helmet>
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
      <section className="max-w-4xl mx-auto px-4 py-16 sm:py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-1.5 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Programa oficial de indicação
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
          Ganhe até <span className="text-primary">3 meses grátis</span> a cada
          restaurante que você indicar
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Chame outros donos de lanchonete, pizzaria ou hamburgueria para o TrendFood.
          A cada assinatura confirmada, os meses grátis caem direto no seu plano —
          automaticamente, sem limite.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link to="/auth">
              Entrar e pegar meu link
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/cadastro">Criar conta grátis</Link>
          </Button>
        </div>

        {/* Reward highlight */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <div className="rounded-2xl bg-gradient-to-br from-primary/90 to-primary text-primary-foreground p-6">
            <p className="text-4xl font-extrabold">+1 mês</p>
            <p className="text-sm opacity-80 mt-1">(30 dias grátis)</p>
            <p className="text-sm opacity-90 mt-3">
              quando seu indicado assinar o <strong>Plano Mensal</strong>
            </p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-6">
            <p className="text-4xl font-extrabold">+3 meses</p>
            <p className="text-sm opacity-80 mt-1">(90 dias grátis)</p>
            <p className="text-sm opacity-90 mt-3">
              quando seu indicado assinar o <strong>Plano Anual</strong>
            </p>
          </div>
        </div>
      </section>

      {/* 3 passos */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
          Como funciona em 3 passos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Share2,
              n: 1,
              title: "Compartilhe seu link",
              desc: "Copie e envie por WhatsApp, Instagram ou grupos de donos de restaurante. Cada conta TrendFood tem seu link único.",
              color: "bg-primary text-primary-foreground",
            },
            {
              icon: UserPlus,
              n: 2,
              title: "Amigo cria a loja",
              desc: "Ele se cadastra pelo seu link, monta o cardápio e testa a plataforma no plano gratuito por 7 dias.",
              color: "bg-emerald-600 text-white",
            },
            {
              icon: CreditCard,
              n: 3,
              title: "Você ganha meses grátis",
              desc: "Quando o pagamento do plano dele é confirmado, os meses são somados automaticamente ao seu plano atual.",
              color: "bg-amber-600 text-white",
            },
          ].map(({ icon: Icon, n, title, desc, color }) => (
            <div key={n} className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">PASSO {n}</span>
              </div>
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Prova social */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="rounded-3xl bg-muted/30 border border-border p-8 sm:p-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
            Por que donos indicam o TrendFood?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            {[
              { title: "Taxa 0% por pedido", desc: "Sem comissão sobre vendas — diferente do iFood (até 27%)." },
              { title: "Cardápio + PDV + KDS", desc: "Tudo em uma plataforma: delivery, mesas, cozinha, caixa." },
              { title: "Suporte de verdade", desc: "Atendimento humano por WhatsApp, todos os dias." },
            ].map((b) => (
              <div key={b.title} className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <Check className="w-5 h-5" />
                </div>
                <h3 className="font-bold">{b.title}</h3>
                <p className="text-sm text-muted-foreground">{b.desc}</p>
              </div>
            ))}
          </div>
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
        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-10 sm:p-14">
          <Gift className="w-12 h-12 mx-auto mb-4 opacity-90" />
          <h2 className="text-3xl sm:text-4xl font-extrabold">
            Pronto para zerar sua mensalidade?
          </h2>
          <p className="mt-3 opacity-90 max-w-xl mx-auto">
            Entre no painel, copie seu link de indicação e comece a somar meses grátis hoje.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-6 gap-2">
            <Link to="/auth">
              Pegar meu link agora
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer mini */}
      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} TrendFood — Cardápio digital taxa 0%</span>
          <div className="flex gap-4">
            <Link to="/termos" className="hover:text-foreground">Termos</Link>
            <Link to="/privacidade" className="hover:text-foreground">Privacidade</Link>
            <Link to="/planos" className="hover:text-foreground">Planos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}