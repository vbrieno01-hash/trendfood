import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import PageSeo from "@/components/seo/PageSeo";
import {
  QrCode, Check, X, ArrowRight, Zap, ShieldCheck, Sparkles,
  Printer, Smartphone, RefreshCw, Utensils, ChefHat, CreditCard,
} from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";

const STEPS = [
  { icon: Utensils, title: "Cadastre seu cardápio", desc: "Fotos, categorias, preços e complementos. Monte em minutos ou copie do cardápio antigo." },
  { icon: QrCode, title: "Gere o QR Code de cada mesa", desc: "O sistema cria automaticamente um QR único por mesa. Baixe em PDF e imprima." },
  { icon: Smartphone, title: "Cliente escaneia e pede", desc: "Sem baixar app, sem cadastro. Escaneou → vê o cardápio → monta o pedido." },
  { icon: ChefHat, title: "Pedido cai direto na cozinha", desc: "Sai impresso automático ou aparece no KDS. Sem garçom anotando, sem erro de comanda." },
];

const COMPARISON = [
  { feature: "Custo por atualização", pdf: "Reimprimir tudo", tf: "R$ 0 — em tempo real" },
  { feature: "Pausar item esgotado", pdf: false, tf: true },
  { feature: "Cliente pede sozinho", pdf: false, tf: true },
  { feature: "Pagamento por PIX na mesa", pdf: false, tf: true },
  { feature: "Impressão automática na cozinha", pdf: false, tf: true },
  { feature: "Relatório de mesa mais lucrativa", pdf: false, tf: true },
];

const FAQ = [
  { q: "O cliente precisa baixar aplicativo pra escanear o QR?", a: "Não. A câmera nativa de qualquer celular (iPhone ou Android) já lê o QR Code e abre direto o cardápio no navegador. Zero fricção." },
  { q: "Como imprimo os QR Codes de cada mesa?", a: "Direto no painel do TrendFood: você escolhe as mesas, gera um PDF pronto pra imprimir (em papel comum, adesivo ou placa acrílica) e cola em cada mesa." },
  { q: "O QR Code muda se eu atualizar o cardápio?", a: "Não. O QR é fixo por mesa — aponta pro seu cardápio online. Quando você atualiza preço, foto ou adiciona um item, o cliente já vê a versão nova sem reimprimir nada." },
  { q: "Consigo aceitar pagamento na mesa?", a: "Sim. Cliente escolhe pagar por PIX (QR na hora), cartão via Mercado Pago, ou marca 'Pagar no caixa'. Você recebe direto na sua conta CNPJ, sem intermediário." },
  { q: "É grátis?", a: "O plano Free permite receber pedidos ilimitados pelo QR Code. Você só paga se quiser recursos avançados como KDS na cozinha, múltiplas impressoras ou multi-unidades." },
  { q: "Serve pra bar, restaurante ou lanchonete?", a: "Serve pros três. Você configura mesas, comanda por pessoa, divisão de conta e integração com cozinha — mesmo sistema, adapta pro seu formato." },
];

export default function CardapioDigitalQrCodePage() {
  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Como criar cardápio digital com QR Code",
    description: "Passo a passo pra montar um cardápio digital com QR Code em cada mesa, grátis, com o TrendFood.",
    totalTime: "PT10M",
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
      { "@type": "ListItem", position: 2, name: "Cardápio digital com QR Code", item: "https://trendfood.site/cardapio-digital-qr-code" },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageSeo
        title="Cardápio Digital com QR Code Grátis | Mesa e Balcão"
        description="Cardápio digital com QR Code na mesa: cliente escaneia, pede sozinho e paga por PIX. Grátis, sem app, atualiza em tempo real. Ideal pra restaurantes e bares."
        path="/cardapio-digital-qr-code"
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
          <QrCode className="w-3.5 h-3.5" /> QR Code na mesa
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
          <span className="text-primary">Cardápio digital</span> com QR Code grátis
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          O cliente escaneia o QR na mesa, monta o pedido sozinho e paga por PIX.
          A cozinha imprime automático. Sem app, sem garçom digitando, sem erro.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600" /> Grátis pra começar</span>
          <span className="inline-flex items-center gap-1.5"><Zap className="w-4 h-4 text-primary" /> Setup em 10 min</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Sem cartão</span>
        </div>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="gap-2"><Link to="/cadastro">Criar meu QR grátis <ArrowRight className="w-4 h-4" /></Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/planos">Ver planos</Link></Button>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold">Como funciona em 4 passos</h2>
          <p className="mt-3 text-muted-foreground">Do zero ao primeiro pedido escaneado na mesa.</p>
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
          <h2 className="text-3xl sm:text-4xl font-bold">Cardápio impresso × QR Code</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Toda vez que o preço muda, o cardápio impresso vira lixo. QR Code atualiza na hora, sem custo.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left font-semibold p-4">Recurso</th>
                <th className="text-center font-semibold p-4">Cardápio impresso</th>
                <th className="text-center font-semibold p-4 text-primary">TrendFood QR</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={row.feature} className={i % 2 === 1 ? "bg-muted/20" : ""}>
                  <td className="p-4 font-medium">{row.feature}</td>
                  {[row.pdf, row.tf].map((v, idx) => (
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

      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold">Tudo que vem no seu QR</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: RefreshCw, title: "Atualização em tempo real", desc: "Mudou preço? Já reflete no QR sem reimprimir nada." },
            { icon: Printer, title: "Impressão automática", desc: "Pedido cai direto na impressora da cozinha ou no KDS." },
            { icon: CreditCard, title: "PIX na mesa", desc: "QR de pagamento gerado na hora. Recebe direto no CNPJ." },
            { icon: Utensils, title: "Comanda por pessoa", desc: "Cada cliente na mesa monta o próprio pedido e a conta divide sozinha." },
            { icon: ChefHat, title: "KDS na cozinha", desc: "Pedidos organizados por status na tela: aguardando, preparando, pronto." },
            { icon: Sparkles, title: "Sem app, sem cadastro", desc: "Cliente abre no navegador em 2 segundos e já está pedindo." },
          ].map((f) => {
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
          <QrCode className="w-12 h-12 mx-auto mb-4 opacity-90" />
          <h2 className="text-3xl sm:text-4xl font-extrabold">Coloque QR Code nas suas mesas hoje</h2>
          <p className="mt-3 opacity-90 max-w-xl mx-auto">Configure em 10 minutos, imprima o QR e comece a receber pedidos direto na cozinha.</p>
          <Button asChild size="lg" variant="secondary" className="mt-6 gap-2">
            <Link to="/cadastro">Criar minha conta grátis <ArrowRight className="w-4 h-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} TrendFood — Cardápio digital taxa 0%</span>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/cardapio-digital-whatsapp" className="hover:text-foreground">Cardápio WhatsApp</Link>
            <Link to="/alternativa-ao-ifood" className="hover:text-foreground">Alternativa ao iFood</Link>
            <Link to="/pdv-restaurante-gratis" className="hover:text-foreground">PDV grátis</Link>
            <Link to="/delivery-sem-taxa" className="hover:text-foreground">Delivery sem taxa</Link>
            <Link to="/planos" className="hover:text-foreground">Planos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}