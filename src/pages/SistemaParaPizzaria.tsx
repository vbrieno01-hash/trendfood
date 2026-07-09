import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import PageSeo from "@/components/seo/PageSeo";
import {
  Pizza, Check, X, ArrowRight, Zap, ShieldCheck, Sparkles,
  Flame, Truck, CreditCard, ChefHat, Timer, Printer, Package, Users,
} from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";

const FEATURES = [
  { icon: Pizza, title: "Metade a metade e bordas", desc: "Cliente monta pizza 1/2 e 1/2, escolhe borda recheada, tamanho e adicional — sem confusão na cozinha." },
  { icon: Timer, title: "Tempo de forno realista", desc: "Configure o tempo de preparo por tipo de pizza. O cliente vê a previsão real, sem ansiedade." },
  { icon: ChefHat, title: "KDS com fila do forno", desc: "As pizzas entram na fila do KDS por ordem de chegada. O forneiro vê tudo numa tela grande, sem papel." },
  { icon: Truck, title: "Motoboys integrados", desc: "Cadastre motoboys, distribua entregas por região e acompanhe cada corrida em tempo real." },
  { icon: CreditCard, title: "PIX, cartão e dinheiro", desc: "Cliente escolhe pagar online (PIX/cartão) ou na entrega. Troco calculado automático." },
  { icon: Printer, title: "Impressão automática", desc: "Comanda sai automática no forno e no balcão. Impressora térmica Bluetooth ou USB — as mais baratas do mercado." },
];

const STEPS = [
  { icon: Package, title: "Cadastre suas pizzas", desc: "Adicione sabores, tamanhos, bordas e adicionais. Permita meia a meia e opcionais por sabor." },
  { icon: Flame, title: "Configure o forno e o KDS", desc: "Defina tempo por tamanho, conecte a impressora e ative o KDS na tela da cozinha." },
  { icon: Users, title: "Chame seus motoboys", desc: "Cadastre entregadores e ative o app /motoboy. Cada um vê só as próprias entregas." },
];

const COMPARISON = [
  { feature: "Taxa por pedido", saipos: "R$ fixo/mês + módulos", goomer: "R$ fixo/mês", ifood: "12–27% do pedido", tf: "0%" },
  { feature: "Pizza meia a meia", saipos: true, goomer: true, ifood: true, tf: true },
  { feature: "Tempo de forno customizável", saipos: true, goomer: false, ifood: false, tf: true },
  { feature: "Motoboy próprio integrado", saipos: true, goomer: false, ifood: false, tf: true },
  { feature: "Plano grátis real", saipos: false, goomer: false, ifood: false, tf: true },
];

const FAQ = [
  { q: "Consigo cadastrar pizza meia a meia com preço diferente por sabor?", a: "Sim. Você define o preço de cada sabor e o sistema calcula automaticamente pelo mais caro (ou pela média — você escolhe a regra na configuração)." },
  { q: "Como o cliente escolhe borda e tamanho?", a: "Na página da pizza o cliente escolhe tamanho (broto, média, grande, família), depois o sabor (1 ou 2), depois a borda (tradicional, catupiry, cheddar) e adicionais. Simples e direto." },
  { q: "Serve pra pizzaria com forno a lenha, com tempo de preparo mais longo?", a: "Serve. Você configura o tempo estimado por tamanho e o cliente vê a previsão. O KDS mostra a fila em ordem pra você priorizar o forno." },
  { q: "Consigo pausar cardápio quando não estou dando conta?", a: "Sim. Pausa a loja inteira em 1 clique, pausa uma categoria (ex: 'sem pizza doce hoje') ou pausa um sabor específico. O cliente não consegue pedir o que você pausou." },
  { q: "Como funciona a entrega própria com meus motoboys?", a: "Você cadastra os entregadores e eles baixam o /motoboy no celular. Cada um vê só as entregas que você atribuiu, marca como saída e como entregue. Sem depender de app terceiro." },
];

export default function SistemaParaPizzariaPage() {
  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "TrendFood — Sistema para Pizzaria",
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
      { "@type": "ListItem", position: 2, name: "Sistema para pizzaria", item: "https://trendfood.site/sistema-para-pizzaria" },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageSeo
        title="Sistema para Pizzaria Grátis | Meia a Meia, KDS e Motoboy — TrendFood"
        description="Sistema para pizzaria com meia a meia, bordas recheadas, KDS na cozinha, motoboys próprios e PIX. Zero taxa por pedido, grátis para começar."
        path="/sistema-para-pizzaria"
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
          <Pizza className="w-3.5 h-3.5" /> Feito pra pizzaria de verdade
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
          O <span className="text-primary">sistema para pizzaria</span> que entende meia a meia
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Cardápio com metade a metade, bordas recheadas, tempo de forno, KDS na cozinha e
          motoboys próprios. Zero taxa por pedido, grátis pra começar.
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
          <h2 className="text-3xl sm:text-4xl font-bold">Recursos pensados pra quem vive de pizza</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Nada de sistema genérico — cada detalhe foi feito pra a operação real da pizzaria.</p>
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
          <h2 className="text-3xl sm:text-4xl font-bold">Do cadastro à primeira pizza saindo do forno</h2>
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
          <p className="mt-3 text-muted-foreground">O que sua pizzaria realmente ganha em cada opção.</p>
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
            "Numa noite de sábado tenho 60+ pizzas em 3 horas. O KDS organiza a fila do forno, o motoboy vê as entregas no app dele e eu não pago mais 25% pro iFood."
          </blockquote>
          <p className="mt-4 text-sm text-muted-foreground">— Depoimento típico de dono de pizzaria usando o TrendFood</p>
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
          <Pizza className="w-12 h-12 mx-auto mb-4 opacity-90" />
          <h2 className="text-3xl sm:text-4xl font-extrabold">Pronto pra tirar sua pizzaria do iFood?</h2>
          <p className="mt-3 opacity-90 max-w-xl mx-auto">Comece grátis, sem cartão, sem contrato. 100% do seu faturamento pra você.</p>
          <Button asChild size="lg" variant="secondary" className="mt-6 gap-2"><Link to="/cadastro">Criar conta grátis<ArrowRight className="w-4 h-4" /></Link></Button>
          <p className="mt-3 text-xs opacity-80">Sem cartão · Sem contrato · Sem taxa por pedido</p>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} TrendFood — Sistema para pizzaria taxa 0%</span>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            <Link to="/sistema-para-lanchonete" className="hover:text-foreground">Lanchonete</Link>
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