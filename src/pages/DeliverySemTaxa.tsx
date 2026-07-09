import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import PageSeo from "@/components/seo/PageSeo";
import {
  Bike, Check, X, ArrowRight, Zap, ShieldCheck,
  MapPin, DollarSign, Clock, Smartphone, MessageCircle, Sparkles,
} from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";

const FEATURES = [
  { icon: MapPin, title: "Taxa por bairro", desc: "Cadastre bairros e defina a taxa de entrega de cada um. Cliente vê o valor antes de fechar o pedido." },
  { icon: Bike, title: "App do motoboy grátis", desc: "Seu entregador acompanha rotas, marca 'saiu pra entrega' e 'entregue' pelo celular." },
  { icon: Smartphone, title: "Cardápio próprio no celular", desc: "Link único da sua loja. Cliente abre no navegador, sem baixar app nenhum." },
  { icon: DollarSign, title: "PIX na hora, dinheiro no seu bolso", desc: "Cliente paga PIX ou cartão. Você recebe direto no CNPJ, sem intermediário." },
  { icon: Clock, title: "Horários e pausas automáticas", desc: "Loja abre e fecha sozinha no horário certo. Pausa quando ficar sobrecarregado." },
  { icon: MessageCircle, title: "Notificação por WhatsApp", desc: "Cliente recebe atualização automática: pedido aceito, saiu pra entrega e entregue." },
];

const COMPARISON = [
  { feature: "Taxa por pedido", others: "12% a 30%", tf: "0%" },
  { feature: "Mensalidade fixa", others: "R$ 130+", tf: "A partir de R$ 0" },
  { feature: "Cardápio digital próprio", others: false, tf: true },
  { feature: "PIX integrado", others: false, tf: true },
  { feature: "App do motoboy incluso", others: false, tf: true },
  { feature: "Taxa personalizada por bairro", others: "Limitado", tf: true },
  { feature: "Notificação por WhatsApp", others: false, tf: true },
  { feature: "Dono da base de clientes", others: "App", tf: "Você" },
];

const FAQ = [
  { q: "É realmente sem taxa por pedido?", a: "Sim. 0% de comissão. Se o pedido é R$ 100, você recebe R$ 100 (menos a taxa da bandeira do cartão, se o cliente pagar por cartão — mesma coisa em qualquer sistema)." },
  { q: "Como o cliente faz o pedido?", a: "Você compartilha o link da sua loja (WhatsApp, Instagram, QR Code, status). Cliente abre no celular, escolhe os itens, informa o endereço (o sistema calcula a taxa automática) e paga PIX ou cartão." },
  { q: "E os motoboys? Preciso contratar?", a: "Você pode usar seus próprios motoboys ou parceiros locais (cooperativa, freelancer). O TrendFood tem app grátis pra motoboy: ele recebe o pedido, faz a entrega e marca como concluído." },
  { q: "Consigo definir uma taxa diferente pra cada bairro?", a: "Sim. Você cadastra cada bairro com sua taxa. O sistema detecta o endereço do cliente e mostra a taxa correta antes dele fechar o pedido — sem surpresa." },
  { q: "Tem tempo mínimo de entrega, valor mínimo?", a: "Você configura tudo: valor mínimo do pedido, tempo estimado de preparo, raio máximo de entrega e bairros atendidos. O sistema respeita todas as regras automáticas." },
  { q: "Preciso de contrato?", a: "Não. Zero contrato, zero fidelidade. Cancela quando quiser. O plano Free é grátis pra sempre — só paga se quiser recursos avançados." },
];

export default function DeliverySemTaxaPage() {
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Sistema de delivery próprio sem taxa de comissão",
    provider: { "@type": "Organization", name: "TrendFood", url: "https://trendfood.site" },
    areaServed: "BR",
    offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
    description: "Sistema de delivery próprio pra restaurantes com 0% de taxa por pedido. Cardápio digital, app do motoboy, PIX integrado e taxa por bairro.",
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: "https://trendfood.site/" },
      { "@type": "ListItem", position: 2, name: "Delivery sem taxa", item: "https://trendfood.site/delivery-sem-taxa" },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageSeo
        title="Delivery Sem Taxa: 0% de Comissão pra Restaurantes"
        description="Sistema de delivery próprio sem taxa por pedido. Cardápio digital, app do motoboy, PIX integrado e taxa por bairro. Fique com 100% do faturamento."
        path="/delivery-sem-taxa"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(serviceJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      </Helmet>

      <header className="border-b border-border/60 backdrop-blur-sm sticky top-0 z-10 bg-background/80">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoIcon} alt="TrendFood" className="w-8 h-8" />
            <span className="font-bold text-lg">TrendFood</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/planos" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">Planos</Link>
            <Button asChild size="sm"><Link to="/auth">Entrar</Link></Button>
          </div>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-4 py-14 sm:py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-1.5 text-xs font-semibold mb-6">
          <Bike className="w-3.5 h-3.5" /> 0% de comissão
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
          <span className="text-primary">Delivery sem taxa</span> — 100% do dinheiro é seu
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Monte seu próprio delivery em minutos: cardápio online, taxa por bairro, app do motoboy
          e PIX na hora. Zero comissão por pedido, pra sempre.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600" /> 0% por pedido</span>
          <span className="inline-flex items-center gap-1.5"><Zap className="w-4 h-4 text-primary" /> Pronto em 15 min</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Sem contrato</span>
        </div>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="gap-2"><Link to="/cadastro">Criar meu delivery grátis <ArrowRight className="w-4 h-4" /></Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/#calculadora">Calcular economia</Link></Button>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold">Delivery próprio, do jeito certo</h2>
          <p className="mt-3 text-muted-foreground">Tudo que você precisa pra rodar entregas sem depender de marketplace.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-2xl border border-border bg-card p-6 space-y-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Icon className="w-5 h-5" /></div>
                <h3 className="font-bold text-lg">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold">Marketplace × Delivery próprio</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Mesmo pedido, mesma entrega. A diferença tá em quem fica com o dinheiro.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left font-semibold p-4">Recurso</th>
                <th className="text-center font-semibold p-4">Marketplace</th>
                <th className="text-center font-semibold p-4 text-primary">TrendFood</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={row.feature} className={i % 2 === 1 ? "bg-muted/20" : ""}>
                  <td className="p-4 font-medium">{row.feature}</td>
                  {[row.others, row.tf].map((v, idx) => (
                    <td key={idx} className="p-4 text-center">
                      {v === true ? <Check className="w-5 h-5 text-emerald-600 mx-auto" /> :
                        v === false ? <X className="w-5 h-5 text-muted-foreground/60 mx-auto" /> :
                        <span className={idx === 1 ? "font-bold text-primary" : "text-muted-foreground"}>{v}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="rounded-3xl bg-muted/30 border border-border p-8 sm:p-12 text-center">
          <Sparkles className="w-10 h-10 text-primary mx-auto mb-4" />
          <blockquote className="text-xl sm:text-2xl font-medium leading-relaxed">
            "Todo pedido pelo TrendFood a gente já sabe: é 100% pra casa. Não tem susto no
            fechamento do mês, não tem 30% sumindo. É outro clima."
          </blockquote>
          <p className="mt-4 text-sm text-muted-foreground">— Feedback típico de restaurante que roda delivery próprio</p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-10">Perguntas frequentes</h2>
        <div className="space-y-4">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group rounded-xl border border-border bg-card p-5 open:shadow-sm">
              <summary className="flex items-center justify-between cursor-pointer font-semibold list-none">
                <span>{q}</span>
                <span className="text-primary transition-transform group-open:rotate-45 text-2xl leading-none">+</span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-10 sm:p-14">
          <Bike className="w-12 h-12 mx-auto mb-4 opacity-90" />
          <h2 className="text-3xl sm:text-4xl font-extrabold">Rode delivery sem pagar 30% pra ninguém</h2>
          <p className="mt-3 opacity-90 max-w-xl mx-auto">Configure em 15 minutos, mande o link no WhatsApp e comece a receber pedidos direto.</p>
          <Button asChild size="lg" variant="secondary" className="mt-6 gap-2">
            <Link to="/cadastro">Começar grátis agora <ArrowRight className="w-4 h-4" /></Link>
          </Button>
          <p className="mt-3 text-xs opacity-80">Sem cartão · Sem contrato · Sem taxa por pedido</p>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} TrendFood — Delivery sem taxa</span>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/cardapio-digital-whatsapp" className="hover:text-foreground">Cardápio WhatsApp</Link>
            <Link to="/cardapio-digital-qr-code" className="hover:text-foreground">QR Code na mesa</Link>
            <Link to="/alternativa-ao-ifood" className="hover:text-foreground">Alternativa ao iFood</Link>
            <Link to="/pdv-restaurante-gratis" className="hover:text-foreground">PDV grátis</Link>
            <Link to="/planos" className="hover:text-foreground">Planos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}