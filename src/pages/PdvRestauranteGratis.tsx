import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import PageSeo from "@/components/seo/PageSeo";
import {
  Monitor, Check, X, ArrowRight, Zap, ShieldCheck,
  Printer, CreditCard, BarChart3, Package, Users, Sparkles,
} from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";

const FEATURES = [
  { icon: Monitor, title: "Frente de caixa completa", desc: "Venda no balcão, mesa ou delivery na mesma tela. Atalhos de teclado, busca rápida por item." },
  { icon: Printer, title: "Impressão automática", desc: "Cupom não-fiscal pro cliente, comanda pra cozinha, via de conferência. Sai tudo no clique." },
  { icon: CreditCard, title: "PIX, cartão e dinheiro", desc: "PIX gerado na hora, integração Mercado Pago pra cartão e controle de troco em dinheiro." },
  { icon: Package, title: "Controle de estoque", desc: "Baixa automática quando o produto é vendido. Alerta quando insumo está acabando." },
  { icon: BarChart3, title: "Relatórios de vendas", desc: "Fechamento de caixa, produto mais vendido, comparativo por dia e forma de pagamento." },
  { icon: Users, title: "Múltiplos operadores", desc: "Cada garçom/caixa com login próprio. Rastreia quem lançou cada venda." },
];

const COMPARISON = [
  { feature: "Preço mensal", others: "R$ 89 a R$ 300", tf: "R$ 0 (plano Free)" },
  { feature: "Frente de caixa (PDV)", others: true, tf: true },
  { feature: "Comanda mesa + delivery na mesma tela", others: false, tf: true },
  { feature: "PIX integrado", others: "Depende", tf: true },
  { feature: "Roda em celular, tablet e PC", others: false, tf: true },
  { feature: "Sem instalação", others: false, tf: true },
  { feature: "Atualização automática", others: false, tf: true },
  { feature: "Suporte por WhatsApp", others: false, tf: true },
];

const FAQ = [
  { q: "É um PDV realmente grátis ou tem pegadinha?", a: "Grátis mesmo. O plano Free do TrendFood inclui o PDV completo — vendas no balcão, impressão, controle de caixa e relatórios básicos. Você só paga se quiser recursos avançados como multi-unidades, iFood e KDS na cozinha." },
  { q: "Preciso de computador específico ou máquina de cartão?", a: "Não. O TrendFood roda em qualquer celular, tablet ou computador com navegador. Se você já tem uma máquina de cartão do Mercado Pago, dá pra integrar direto." },
  { q: "Emite cupom fiscal (NFC-e)?", a: "O TrendFood imprime cupom não-fiscal e comanda pra cozinha. Emissão fiscal (NFC-e) fica por conta do seu contador ou app específico — mas a maioria dos MEIs e pequenos restaurantes não precisa emitir por venda." },
  { q: "Funciona offline se cair a internet?", a: "O TrendFood precisa de internet pra sincronizar, mas o app Android roda em modo offline emergencial: você lança vendas e elas sobem automaticamente quando a conexão volta." },
  { q: "Consigo integrar com iFood e WhatsApp?", a: "Sim. O PDV recebe pedidos do iFood, do WhatsApp e do seu cardápio próprio na mesma tela — tudo unificado, sem precisar catar em vários lugares." },
  { q: "Quanto tempo demora pra começar a usar?", a: "Setup em menos de 10 minutos: cria a conta, cadastra os produtos (ou copia de um cardápio existente) e já está vendendo. Sem instalação, sem servidor, sem técnico." },
];

export default function PdvRestauranteGratisPage() {
  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "TrendFood PDV — Sistema de Ponto de Venda pra Restaurante",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android",
    offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
    description: "PDV grátis pra restaurantes, lanchonetes, bares e food trucks. Frente de caixa, comanda, impressão e controle de estoque no mesmo sistema.",
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
      { "@type": "ListItem", position: 2, name: "PDV pra restaurante grátis", item: "https://trendfood.site/pdv-restaurante-gratis" },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageSeo
        title="PDV pra Restaurante Grátis | Frente de Caixa Online"
        description="Sistema PDV grátis pra restaurante, lanchonete e bar. Frente de caixa, comanda, impressão, PIX e estoque. Roda em celular, tablet e PC. Sem instalar nada."
        path="/pdv-restaurante-gratis"
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
          <Monitor className="w-3.5 h-3.5" /> Frente de caixa online
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
          <span className="text-primary">PDV grátis</span> pra restaurante, bar e lanchonete
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Frente de caixa completa no celular, tablet ou PC. Comanda, impressão, PIX, controle
          de estoque e relatórios — tudo no plano Free.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600" /> Grátis sem prazo</span>
          <span className="inline-flex items-center gap-1.5"><Zap className="w-4 h-4 text-primary" /> Sem instalar nada</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Sem cartão</span>
        </div>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="gap-2"><Link to="/cadastro">Testar PDV grátis <ArrowRight className="w-4 h-4" /></Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/planos">Ver planos</Link></Button>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold">Tudo que o seu caixa precisa</h2>
          <p className="mt-3 text-muted-foreground">No mesmo lugar, sem instalar programa e sem pagar mensalidade.</p>
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
          <h2 className="text-3xl sm:text-4xl font-bold">Outros PDVs × TrendFood</h2>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left font-semibold p-4">Recurso</th>
                <th className="text-center font-semibold p-4">PDV tradicional</th>
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
            "Troquei um PDV que custava R$ 189/mês pelo TrendFood. Mesma coisa, menos travamento,
            e ainda ganhei o cardápio digital de brinde."
          </blockquote>
          <p className="mt-4 text-sm text-muted-foreground">— Feedback típico de dono de lanchonete</p>
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
          <Monitor className="w-12 h-12 mx-auto mb-4 opacity-90" />
          <h2 className="text-3xl sm:text-4xl font-extrabold">Comece a vender em 10 minutos</h2>
          <p className="mt-3 opacity-90 max-w-xl mx-auto">Sem instalação, sem servidor, sem mensalidade. Abra a conta grátis e faça a primeira venda hoje.</p>
          <Button asChild size="lg" variant="secondary" className="mt-6 gap-2">
            <Link to="/cadastro">Abrir minha conta grátis <ArrowRight className="w-4 h-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} TrendFood — PDV grátis pra restaurante</span>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/cardapio-digital-whatsapp" className="hover:text-foreground">Cardápio WhatsApp</Link>
            <Link to="/cardapio-digital-qr-code" className="hover:text-foreground">QR Code na mesa</Link>
            <Link to="/alternativa-ao-ifood" className="hover:text-foreground">Alternativa ao iFood</Link>
            <Link to="/delivery-sem-taxa" className="hover:text-foreground">Delivery sem taxa</Link>
            <Link to="/planos" className="hover:text-foreground">Planos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}