import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import PageSeo from "@/components/seo/PageSeo";
import {
  UtensilsCrossed, Check, X, ArrowRight, Zap, ShieldCheck, Sparkles,
  QrCode, ChefHat, Users, Printer, CreditCard, BarChart3,
  UserPlus, Package, Palette,
} from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";

const STEPS = [
  { icon: UserPlus, title: "Crie sua conta grátis", desc: "Cadastro em 30 segundos por e-mail ou Google. Sem cartão, sem período de teste enganoso." },
  { icon: Package, title: "Monte seu cardápio", desc: "Categorias, pratos, complementos, bebidas e sobremesas. Fotos, preços e disponibilidade por dia da semana." },
  { icon: Palette, title: "Personalize a marca", desc: "Cores, logo, capa e horário. Sua página fica com a identidade do restaurante — não parece marketplace." },
  { icon: QrCode, title: "Imprima os QR Codes das mesas", desc: "O sistema gera um QR único por mesa. Cliente escaneia, abre o cardápio direto na comanda daquela mesa." },
  { icon: ChefHat, title: "Ative KDS e garçom", desc: "Cozinha vê os pedidos por status no KDS. Garçom acompanha pelas mesas em tempo real, sem correr atrás de comanda." },
];

const FEATURES = [
  { icon: QrCode, title: "QR Code por mesa", desc: "Cada mesa tem um QR fixo. Cliente pede sem esperar garçom, garçom foca em servir e vender mais." },
  { icon: Users, title: "Módulo garçom completo", desc: "Abertura e fechamento de comanda, divisão de conta, taxa de serviço e transferência de mesa." },
  { icon: ChefHat, title: "KDS na cozinha", desc: "Telas separadas por estação (quente, fria, bar). Pedido cai automático — cozinha e salão sincronizados." },
  { icon: Printer, title: "Impressão automática", desc: "Impressora térmica Bluetooth ou USB. Pedido sai automático na cozinha, no bar e no balcão de pagamento." },
  { icon: CreditCard, title: "PIX e cartão integrados", desc: "Cliente paga pelo próprio celular ou fecha na maquininha. PIX gera QR na hora, cartão via Mercado Pago." },
  { icon: BarChart3, title: "Relatórios de verdade", desc: "Faturamento por mesa, prato mais vendido, ticket médio, horário de pico — tudo em relatórios exportáveis." },
];

const COMPARISON = [
  { feature: "Cardápio em papel", papel: true, garcom: true, tf: true },
  { feature: "Cliente pede sem esperar garçom", papel: false, garcom: false, tf: true },
  { feature: "Atualiza preço em tempo real", papel: false, garcom: false, tf: true },
  { feature: "Divisão automática de conta", papel: false, garcom: false, tf: true },
  { feature: "Cozinha recebe pedido automático", papel: false, garcom: false, tf: true },
  { feature: "Relatório de venda por prato", papel: false, garcom: false, tf: true },
  { feature: "Custo mensal", papel: "impressão", garcom: "R$ salário +", tf: "R$ 0 (Free)" },
];

const FAQ = [
  { q: "O QR Code funciona sem internet no celular do cliente?", a: "O QR abre o cardápio no navegador do cliente pelo Wi-Fi do restaurante ou pelos dados dele. Depois de aberto, ele pode navegar mesmo com sinal fraco — a página é leve e feita pra rodar em qualquer celular." },
  { q: "Meus garçons perdem o emprego se o cliente pedir sozinho?", a: "Pelo contrário. O garçom deixa de ser 'anotador de pedido' e vira consultor: recomenda pratos, cuida da experiência e faz upsell. Restaurantes que adotam QR Code aumentam ticket médio em 15–30%." },
  { q: "Consigo controlar disponibilidade de pratos (ex: 'acabou o salmão')?", a: "Sim. Pausa item em 1 clique — some do cardápio na hora, pra todas as mesas. Volta quando quiser. Também dá pra pausar categoria inteira e definir dias da semana em que cada prato aparece." },
  { q: "Serve pra restaurante à la carte, self-service ou rodízio?", a: "Serve os três. Você configura o modo: à la carte usa mesa+comanda, self-service pode usar só balcão (PDV), rodízio ativa taxa fixa por pessoa e permite pedir bebidas pela mesa." },
  { q: "Quanto custa por mesa? Tem limite?", a: "Não tem cobrança por mesa nem por pedido. O plano Free já permite cardápio digital e QR nas mesas. Os planos pagos adicionam KDS, garçom, múltiplas unidades — mas nunca taxa por pedido." },
];

export default function CardapioDigitalParaRestaurantePage() {
  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Como colocar cardápio digital no restaurante",
    description: "Passo a passo para implantar cardápio digital, QR Code nas mesas, KDS e módulo garçom num restaurante com o TrendFood.",
    totalTime: "PT15M",
    step: STEPS.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title, text: s.desc })),
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
      { "@type": "ListItem", position: 2, name: "Cardápio digital para restaurante", item: "https://trendfood.site/cardapio-digital-para-restaurante" },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageSeo
        title="Cardápio Digital para Restaurante | QR Code, Garçom e KDS — TrendFood"
        description="Cardápio digital completo para restaurante: QR Code nas mesas, módulo garçom, KDS na cozinha e pagamento integrado. Grátis para começar, sem taxa por pedido."
        path="/cardapio-digital-para-restaurante"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(howToJsonLd)}</script>
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
          <UtensilsCrossed className="w-3.5 h-3.5" /> Cardápio digital pra restaurante
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
          <span className="text-primary">Cardápio digital</span> para restaurante com QR nas mesas
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Cliente escaneia o QR da mesa, monta o pedido e paga pelo celular. Cozinha recebe automático,
          garçom foca em servir. Sem taxa por pedido, grátis pra começar.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600" /> 0% de comissão</span>
          <span className="inline-flex items-center gap-1.5"><Zap className="w-4 h-4 text-primary" /> Setup em 15 minutos</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Sem cartão de crédito</span>
        </div>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="gap-2"><Link to="/cadastro">Criar cardápio grátis<ArrowRight className="w-4 h-4" /></Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/planos">Ver planos</Link></Button>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold">Como colocar cardápio digital no seu restaurante em 5 passos</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Do cadastro à primeira mesa pedindo pelo QR, sem precisar chamar TI.</p>
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

      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold">O que vem no cardápio digital do TrendFood</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Não é só um QR bonito — é o restaurante inteiro rodando num só sistema.</p>
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
          <h2 className="text-3xl sm:text-4xl font-bold">Cardápio de papel, garçom anotando ou TrendFood?</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Comparativo direto entre os 3 jeitos de operar o salão do seu restaurante.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left font-semibold p-4">Recurso</th>
                  <th className="text-center font-semibold p-4">Cardápio de papel</th>
                  <th className="text-center font-semibold p-4">Só garçom anotando</th>
                  <th className="text-center font-semibold p-4 text-primary">TrendFood</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 1 ? "bg-muted/20" : ""}>
                    <td className="p-4 font-medium">{row.feature}</td>
                    {[row.papel, row.garcom, row.tf].map((v, idx) => (
                      <td key={idx} className="p-4 text-center">
                        {v === true ? <Check className="w-5 h-5 text-emerald-600 mx-auto" /> :
                         v === false ? <X className="w-5 h-5 text-muted-foreground/60 mx-auto" /> :
                         <span className={idx === 2 ? "font-bold text-primary" : "text-muted-foreground"}>{v}</span>}
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
            "Coloquei o QR nas mesas e o ticket médio subiu 18%. O cliente vê a foto, se anima e adiciona sobremesa e bebida. O garçom passa mais tempo servindo, menos tempo anotando."
          </blockquote>
          <p className="mt-4 text-sm text-muted-foreground">— Depoimento típico de dono de restaurante usando o TrendFood</p>
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
          <UtensilsCrossed className="w-12 h-12 mx-auto mb-4 opacity-90" />
          <h2 className="text-3xl sm:text-4xl font-extrabold">Seu restaurante merece um cardápio à altura</h2>
          <p className="mt-3 opacity-90 max-w-xl mx-auto">Crie sua conta, monte o cardápio e imprima os QRs das mesas hoje mesmo. Grátis.</p>
          <Button asChild size="lg" variant="secondary" className="mt-6 gap-2"><Link to="/cadastro">Começar grátis<ArrowRight className="w-4 h-4" /></Link></Button>
          <p className="mt-3 text-xs opacity-80">Sem cartão · Sem contrato · Sem taxa por pedido</p>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} TrendFood — Cardápio digital taxa 0%</span>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            <Link to="/sistema-para-lanchonete" className="hover:text-foreground">Lanchonete</Link>
            <Link to="/sistema-para-pizzaria" className="hover:text-foreground">Pizzaria</Link>
            <Link to="/cardapio-digital-qr-code" className="hover:text-foreground">QR na mesa</Link>
            <Link to="/cardapio-digital-whatsapp" className="hover:text-foreground">Cardápio WhatsApp</Link>
            <Link to="/planos" className="hover:text-foreground">Planos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}