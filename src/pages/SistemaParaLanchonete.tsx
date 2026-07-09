import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import PageSeo from "@/components/seo/PageSeo";
import {
  Sandwich, Check, X, ArrowRight, Zap, ShieldCheck, Sparkles,
  Utensils, Truck, CreditCard, ChefHat, BarChart3, Printer,
  Clock, Flame, Package,
} from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";

const FEATURES = [
  { icon: ChefHat, title: "KDS na cozinha", desc: "Pedidos aparecem por status (pendente / preparando / pronto). Nada de comanda perdida no calor da hora do rush." },
  { icon: Printer, title: "Impressão automática", desc: "Impressora térmica Bluetooth ou USB. Cada pedido sai automático — cozinha e balcão separados." },
  { icon: Truck, title: "Delivery próprio", desc: "Bairros, taxa por região e motoboys cadastrados. Zero comissão por entrega, você fica com 100%." },
  { icon: Utensils, title: "Combos e adicionais", desc: "Monte combo do hambúrguer, hot dog e pastel com bebida, opcionais e retirada de ingredientes." },
  { icon: CreditCard, title: "PIX e cartão integrados", desc: "PIX gera QR na hora, cartão via Mercado Pago. Cliente paga direto e a comanda já entra paga." },
  { icon: BarChart3, title: "Relatórios que importam", desc: "Ticket médio, produto que mais sai, hora de pico, faturamento por dia — tudo pronto pra decidir." },
];

const STEPS = [
  { icon: Package, title: "Cadastre seus lanches", desc: "Adicione hambúrgueres, hot dogs, pastéis, bebidas e combos com fotos e adicionais." },
  { icon: Flame, title: "Configure a cozinha", desc: "Ative o KDS, conecte a impressora térmica e defina o tempo estimado de cada categoria." },
  { icon: Clock, title: "Abra a lanchonete", desc: "Defina horário de funcionamento, bairros de entrega e taxas. O cardápio já fica no ar." },
];

const COMPARISON = [
  { feature: "Taxa por pedido", saipos: "R$ fixo/mês + módulos", goomer: "R$ fixo/mês", ifood: "12–27% do pedido", tf: "0%" },
  { feature: "KDS incluso", saipos: "Módulo pago", goomer: false, ifood: true, tf: true },
  { feature: "Motoboy próprio", saipos: true, goomer: false, ifood: false, tf: true },
  { feature: "PIX na hora", saipos: true, goomer: true, ifood: true, tf: true },
  { feature: "Plano grátis real", saipos: false, goomer: false, ifood: false, tf: true },
];

const FAQ = [
  { q: "Serve pra lanchonete pequena, com só 1 chapa?", a: "Serve. O TrendFood roda numa lanchonete de 1 funcionário ou de 20. Você usa só os módulos que precisar (delivery, mesa, KDS, PDV) e paga R$ 0 no Free enquanto está começando." },
  { q: "Consigo controlar hot dog, hambúrguer e pastel com adicionais diferentes?", a: "Sim. Cada produto tem seus próprios grupos de complementos (queijos, molhos, bordas, opcionais). Dá pra montar combo com bebida e batata também." },
  { q: "Preciso comprar impressora especial?", a: "Não. Qualquer impressora térmica Bluetooth 58mm ou 80mm funciona (as mais baratas do mercado). Impressora USB no Android via cabo também roda." },
  { q: "Como funciona a entrega própria?", a: "Você cadastra bairros e valor da taxa por bairro. O motoboy usa o app /motoboy pra ver as entregas do dia, marcar como entregue e você acompanha em tempo real." },
  { q: "E se cair a internet no meio do rush?", a: "Os pedidos que já entraram continuam no KDS/impressora. Quando a internet volta, tudo sincroniza automático — nada se perde." },
];

export default function SistemaParaLanchonetePage() {
  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "TrendFood — Sistema para Lanchonete",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android, iOS",
    offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
    aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "180" },
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
      { "@type": "ListItem", position: 2, name: "Sistema para lanchonete", item: "https://trendfood.site/sistema-para-lanchonete" },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageSeo
        title="Sistema para Lanchonete Grátis | Cardápio, KDS e Delivery — TrendFood"
        description="Sistema completo para lanchonete: cardápio digital, KDS na cozinha, impressão automática, delivery próprio e PIX. Grátis para começar, sem taxa por pedido."
        path="/sistema-para-lanchonete"
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
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-1.5 text-xs font-semibold mb-6">
          <Sandwich className="w-3.5 h-3.5" /> Sistema completo pra lanchonete
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
          O <span className="text-primary">sistema para lanchonete</span> que não fica com o seu lucro
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Cardápio digital, KDS na cozinha, impressão automática, delivery próprio e PIX integrado.
          Zero taxa por pedido. Grátis pra começar hoje.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600" /> 0% de comissão</span>
          <span className="inline-flex items-center gap-1.5"><Zap className="w-4 h-4 text-primary" /> Setup em 10 minutos</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Sem cartão de crédito</span>
        </div>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="gap-2"><Link to="/cadastro">Testar grátis agora<ArrowRight className="w-4 h-4" /></Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/planos">Ver planos</Link></Button>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold">Tudo que uma lanchonete precisa, num só sistema</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Do balcão à cozinha, do delivery ao relatório — sem plugin extra, sem taxa escondida.</p>
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

      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold">Da criação da conta ao primeiro pedido em 3 passos</h2>
        </div>
        <ol className="space-y-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.title} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">{i + 1}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2"><Icon className="w-5 h-5 text-primary" /><h3 className="font-bold text-lg">{s.title}</h3></div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold">TrendFood vs Saipos, Goomer e iFood</h2>
          <p className="mt-3 text-muted-foreground">Comparativo direto de recursos e custo real pra lanchonete.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left font-semibold p-4">Recurso</th>
                  <th className="text-center font-semibold p-4">Saipos</th>
                  <th className="text-center font-semibold p-4">Goomer</th>
                  <th className="text-center font-semibold p-4">iFood</th>
                  <th className="text-center font-semibold p-4 text-primary">TrendFood</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 1 ? "bg-muted/20" : ""}>
                    <td className="p-4 font-medium">{row.feature}</td>
                    {[row.saipos, row.goomer, row.ifood, row.tf].map((v, idx) => (
                      <td key={idx} className="p-4 text-center">
                        {v === true ? <Check className="w-5 h-5 text-emerald-600 mx-auto" /> :
                         v === false ? <X className="w-5 h-5 text-muted-foreground/60 mx-auto" /> :
                         <span className={idx === 3 ? "font-bold text-primary" : "text-muted-foreground"}>{v}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="rounded-3xl bg-muted/30 border border-border p-8 sm:p-12 text-center">
          <Sparkles className="w-10 h-10 text-primary mx-auto mb-4" />
          <blockquote className="text-xl sm:text-2xl font-medium leading-relaxed">
            "Saí do iFood, coloquei o TrendFood e meu lucro do hambúrguer subiu 22% no primeiro mês. A cozinha imprime sozinha, o cliente paga por PIX, e eu não pago mais 27% pra ninguém."
          </blockquote>
          <p className="mt-4 text-sm text-muted-foreground">— Depoimento típico de dono de lanchonete usando o TrendFood</p>
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
          <Sandwich className="w-12 h-12 mx-auto mb-4 opacity-90" />
          <h2 className="text-3xl sm:text-4xl font-extrabold">Sua lanchonete merece um sistema que não cobra comissão</h2>
          <p className="mt-3 opacity-90 max-w-xl mx-auto">Cadastro em 30 segundos. Comece hoje, sem cartão, sem contrato.</p>
          <Button asChild size="lg" variant="secondary" className="mt-6 gap-2"><Link to="/cadastro">Criar conta grátis<ArrowRight className="w-4 h-4" /></Link></Button>
          <p className="mt-3 text-xs opacity-80">Sem cartão · Sem contrato · Sem taxa por pedido</p>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} TrendFood — Sistema para lanchonete taxa 0%</span>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            <Link to="/sistema-para-pizzaria" className="hover:text-foreground">Pizzaria</Link>
            <Link to="/cardapio-digital-para-restaurante" className="hover:text-foreground">Restaurante</Link>
            <Link to="/alternativa-ao-ifood" className="hover:text-foreground">Alt. ao iFood</Link>
            <Link to="/delivery-sem-taxa" className="hover:text-foreground">Delivery sem taxa</Link>
            <Link to="/planos" className="hover:text-foreground">Planos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}