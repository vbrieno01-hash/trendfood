import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import PageSeo from "@/components/seo/PageSeo";
import {
  DollarSign, Check, X, ArrowRight, Zap, ShieldCheck, TrendingUp,
  Users, Package, Rocket, Store, MessageCircle, Sparkles,
} from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";

const COMPARISON = [
  { feature: "Taxa por pedido", ifood: "12% a 30%", tf: "0%" },
  { feature: "Mensalidade fixa", ifood: "R$ 130+", tf: "A partir de R$ 0" },
  { feature: "Dono da base de clientes", ifood: "iFood", tf: "Você" },
  { feature: "Pode oferecer desconto direto", ifood: false, tf: true },
  { feature: "Recebe o dinheiro na hora (PIX)", ifood: false, tf: true },
  { feature: "Cardápio próprio no WhatsApp", ifood: false, tf: true },
  { feature: "Sem contrato de fidelidade", ifood: false, tf: true },
  { feature: "Suporte por WhatsApp", ifood: false, tf: true },
];

const MIGRATION = [
  { icon: Package, title: "1. Importe seu cardápio", desc: "Copie os produtos do seu iFood ou envie fotos — cadastramos junto se precisar. Leva 15 minutos." },
  { icon: Store, title: "2. Personalize sua loja", desc: "Logo, cores, horários e bairros de entrega. Sua página fica pronta em minutos." },
  { icon: MessageCircle, title: "3. Avise seus clientes", desc: "Mande o link no WhatsApp, Instagram e status. Todo pedido que vier de lá é 100% seu." },
  { icon: Rocket, title: "4. Comece a vender sem taxa", desc: "Aceite PIX, cartão e dinheiro. Zero comissão por pedido, pra sempre." },
];

const FAQ = [
  { q: "Preciso sair do iFood pra usar o TrendFood?", a: "Não. Muitos donos usam os dois em paralelo — mantêm o iFood pra tráfego novo e migram os clientes recorrentes pro TrendFood pra não pagar 30% de comissão. Aos poucos você vira a chave." },
  { q: "Como o cliente descobre minha loja no TrendFood?", a: "O TrendFood não é marketplace, é o seu delivery próprio. Você compartilha o link no WhatsApp, Instagram, redes sociais e QR Code no balcão. Toda venda que vier é sua — e o cliente vira recorrente." },
  { q: "Realmente é 0% de taxa?", a: "Sim, 0% de comissão por pedido. Existe uma mensalidade fixa (o plano Free custa R$ 0) e taxa da bandeira do cartão (paga pelo Mercado Pago, igual em qualquer sistema). Nada além disso — se você faz R$ 30k no mês, você recebe R$ 30k." },
  { q: "Quanto eu economizo saindo do iFood?", a: "Um restaurante que fatura R$ 20 mil/mês no iFood paga em média R$ 4 mil a R$ 6 mil de comissão. Com o TrendFood, essa mesma operação custa R$ 0 a R$ 79/mês. A economia paga o TrendFood em menos de 1 dia." },
  { q: "E os motoboys? Como funciona a entrega?", a: "Você usa seus próprios motoboys ou parceiros locais. O TrendFood tem módulo de motoboy grátis: distribui rotas, calcula taxa por bairro e o entregador acompanha pelo celular." },
  { q: "Tenho contrato? Preciso ficar preso?", a: "Não. Sem contrato, sem fidelidade, sem multa. Cancela quando quiser direto no painel. O plano Free é grátis pra sempre — você só paga se quiser mais recursos." },
];

export default function AlternativaAoIfoodPage() {
  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "TrendFood — Alternativa ao iFood",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android",
    offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
    description: "Sistema de delivery próprio sem taxa de comissão. Alternativa ao iFood pra restaurantes que querem parar de perder 30% em cada pedido.",
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
      { "@type": "ListItem", position: 2, name: "Alternativa ao iFood", item: "https://trendfood.site/alternativa-ao-ifood" },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageSeo
        title="Alternativa ao iFood Sem Taxa de Comissão | TrendFood"
        description="Cansado de pagar 30% de comissão pro iFood? O TrendFood é seu delivery próprio com 0% de taxa. Migre em 1 dia e fique com 100% do faturamento."
        path="/alternativa-ao-ifood"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(softwareJsonLd)}</script>
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
        <div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 text-red-700 dark:text-red-400 px-4 py-1.5 text-xs font-semibold mb-6">
          <DollarSign className="w-3.5 h-3.5" /> Zero comissão por pedido
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
          A alternativa ao <span className="text-primary">iFood</span> sem taxa de comissão
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Se você fatura R$ 20 mil/mês no iFood, tá deixando <b>R$ 5 mil</b> na mesa toda vez.
          Migre pro TrendFood e fique com <b>100%</b> do que vender — sem contrato, sem pegadinha.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600" /> 0% de comissão</span>
          <span className="inline-flex items-center gap-1.5"><Zap className="w-4 h-4 text-primary" /> Migração em 1 dia</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Sem contrato</span>
        </div>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="gap-2"><Link to="/cadastro">Sair do iFood grátis <ArrowRight className="w-4 h-4" /></Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/#calculadora">Calcular minha economia</Link></Button>
        </div>
      </section>

      {/* Economia destaque */}
      <section className="max-w-4xl mx-auto px-4 py-8">
        <div className="rounded-3xl border border-border bg-card p-8 sm:p-12 text-center">
          <TrendingUp className="w-10 h-10 text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Se você fatura R$ 20k/mês no iFood…</p>
          <p className="mt-3 text-4xl sm:text-6xl font-extrabold text-primary">R$ 5.400</p>
          <p className="mt-2 text-lg text-muted-foreground">é o que você <b>deixa de pagar</b> por mês migrando pro TrendFood</p>
          <p className="mt-6 text-sm text-muted-foreground">Baseado em 27% de comissão média cobrada pelo iFood (incluindo taxa de serviço + entrega).</p>
          <Button asChild size="lg" variant="outline" className="mt-6"><Link to="/#calculadora">Calcular pro meu faturamento</Link></Button>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold">iFood × TrendFood: o que muda</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Mesmo cardápio, mesmo cliente, mesmo pedido — só que sem pagar 30%.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left font-semibold p-4">Recurso</th>
                <th className="text-center font-semibold p-4">iFood</th>
                <th className="text-center font-semibold p-4 text-primary">TrendFood</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={row.feature} className={i % 2 === 1 ? "bg-muted/20" : ""}>
                  <td className="p-4 font-medium">{row.feature}</td>
                  {[row.ifood, row.tf].map((v, idx) => (
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

      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold">Migre em 1 dia</h2>
          <p className="mt-3 text-muted-foreground">Sem parar de vender, sem drama. A gente ajuda no cadastro se precisar.</p>
        </div>
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MIGRATION.map((s) => {
            const Icon = s.icon;
            return (
              <li key={s.title} className="rounded-2xl border border-border bg-card p-6 space-y-2">
                <div className="flex items-center gap-2"><Icon className="w-5 h-5 text-primary" /><h3 className="font-bold text-lg">{s.title}</h3></div>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="rounded-3xl bg-muted/30 border border-border p-8 sm:p-12 text-center">
          <Sparkles className="w-10 h-10 text-primary mx-auto mb-4" />
          <blockquote className="text-xl sm:text-2xl font-medium leading-relaxed">
            "Tava pagando R$ 4.800/mês só de comissão pro iFood. Migrei os clientes recorrentes
            pro TrendFood e em 2 meses recuperei o suficiente pra comprar uma moto pro delivery."
          </blockquote>
          <p className="mt-4 text-sm text-muted-foreground">— Depoimento típico de quem migra do iFood</p>
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
          <Users className="w-12 h-12 mx-auto mb-4 opacity-90" />
          <h2 className="text-3xl sm:text-4xl font-extrabold">Chega de pagar 30% pra alguém</h2>
          <p className="mt-3 opacity-90 max-w-xl mx-auto">Crie sua conta grátis, monte seu delivery próprio e fique com 100% do que vender.</p>
          <Button asChild size="lg" variant="secondary" className="mt-6 gap-2">
            <Link to="/cadastro">Começar grátis agora <ArrowRight className="w-4 h-4" /></Link>
          </Button>
          <p className="mt-3 text-xs opacity-80">Sem cartão · Sem contrato · Sem taxa por pedido</p>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} TrendFood — Zero taxa de comissão</span>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/cardapio-digital-whatsapp" className="hover:text-foreground">Cardápio WhatsApp</Link>
            <Link to="/cardapio-digital-qr-code" className="hover:text-foreground">QR Code na mesa</Link>
            <Link to="/pdv-restaurante-gratis" className="hover:text-foreground">PDV grátis</Link>
            <Link to="/delivery-sem-taxa" className="hover:text-foreground">Delivery sem taxa</Link>
            <Link to="/planos" className="hover:text-foreground">Planos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}