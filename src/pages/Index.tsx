import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ShowcaseSection from "@/components/landing/ShowcaseSection";
import {
  ChefHat,
  Heart,
  BarChart3,
  Zap,
  ArrowRight,
  QrCode,
  UtensilsCrossed,
  TrendingUp,
  Lightbulb,
  ThumbsUp,
  ChevronRight,
} from "lucide-react";

const problems = [
  {
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80",
    alt: "Chef pensando no cardápio",
    title: "Não sabe o que lançar?",
    description:
      "Você testa um produto novo sem saber se vai vender. Corre o risco de investir em algo que não tem saída.",
  },
  {
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80",
    alt: "Prato não vendido na mesa",
    title: "Lança e não vende?",
    description:
      "O novo lanche não emplacou. Desperdício de ingredientes, tempo e energia — sem entender o porquê.",
  },
  {
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80",
    alt: "Restaurante cheio de clientes",
    title: "Perde clientes para a concorrência?",
    description:
      "Seu concorrente lançou exatamente o que seu cliente queria. E você ficou para trás por não ter ouvido seu público.",
  },
];

const steps = [
  {
    number: "01",
    icon: <ChefHat className="w-6 h-6" />,
    title: "Crie seu estabelecimento",
    description:
      "Cadastre seu negócio em menos de 2 minutos e receba um link exclusivo para compartilhar com seus clientes via WhatsApp, Instagram ou QR Code nas mesas.",
  },
  {
    number: "02",
    icon: <Heart className="w-6 h-6" />,
    title: "Clientes sugerem e votam",
    description:
      "Seus clientes acessam a página pública, enviam ideias de novos pratos e votam nos favoritos — sem precisar baixar nenhum aplicativo.",
  },
  {
    number: "03",
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Você decide o que lançar",
    description:
      "No seu painel completo, veja as sugestões mais votadas em tempo real e coloque as melhores no cardápio com total confiança de que vão vender.",
  },
];

const features = [
  {
    icon: <Lightbulb className="w-5 h-5" />,
    title: "Mural de Sugestões",
    description: "Página pública onde clientes enviam e veem as sugestões da comunidade.",
  },
  {
    icon: <ThumbsUp className="w-5 h-5" />,
    title: "Votação em Tempo Real",
    description: "Os clientes votam nos lanches favoritos. Você vê os resultados ao vivo.",
  },
  {
    icon: <UtensilsCrossed className="w-5 h-5" />,
    title: "Gestão de Pedidos",
    description: "Controle de mesas, garçom e cozinha integrados em um só painel.",
  },
  {
    icon: <ChefHat className="w-5 h-5" />,
    title: "Cardápio Digital",
    description: "Monte seu cardápio online com categorias, preços e fotos dos produtos.",
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: "Painel de Métricas",
    description: "Acompanhe tendências, pedidos e o desempenho do seu negócio.",
  },
  {
    icon: <QrCode className="w-5 h-5" />,
    title: "QR Code para Mesas",
    description: "Gere QR Codes para cada mesa. Clientes pedem sem precisar chamar o garçom.",
  },
];

const examples = [
  {
    slug: "burguer-da-hora",
    name: "Burguer da Hora",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80",
    alt: "Hambúrguer premium",
  },
  {
    slug: "pizza-feliz",
    name: "Pizza Feliz",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80",
    alt: "Pizza artesanal",
  },
];

const proofBadges = [
  "Sem instalação de app",
  "Link compartilhável",
  "Votação em tempo real",
  "100% mobile",
  "Painel completo",
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-screen flex flex-col">
        {/* Background photo */}
        <img
          src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1920&q=80"
          alt="Hambúrguer premium apetitoso"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Overlay */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, rgba(26,5,5,0.92) 0%, rgba(45,10,10,0.88) 40%, rgba(26,5,5,0.95) 100%)" }}
        />

        {/* Header */}
        <header className="relative z-10 border-b border-white/10">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <ChefHat className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-white text-lg">TrendFood</span>
            </div>
            <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white bg-transparent" asChild>
              <Link to="/auth">Entrar</Link>
            </Button>
          </div>
        </header>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex items-center">
          <div className="max-w-5xl mx-auto px-4 py-20 text-center w-full">
            <Badge className="mb-6 bg-primary/20 text-red-300 border-primary/30 hover:bg-primary/20">
              <Zap className="w-3 h-3 mr-1" />
              Inteligência de dados para o seu negócio
            </Badge>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight tracking-tight">
              Seu cardápio,{" "}
              <span className="text-primary">turbinado</span>
              <br />
              pelos seus clientes
            </h1>

            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-4 leading-relaxed">
              Descubra exatamente o que seu público quer comer. Colete sugestões, receba votos em tempo real e lance os pratos que já nascem campeões de vendas.
            </p>
            <p className="text-sm md:text-base text-white/50 max-w-xl mx-auto mb-10 leading-relaxed">
              Uma equipe de inteligência de dados trabalhando para sua lanchonete, 24 horas por dia — sem precisar de app.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="text-base font-bold gap-2 shadow-lg shadow-primary/40" asChild>
                <Link to="/auth">
                  Começar Grátis
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base border-white/30 text-white hover:bg-white/10 hover:text-white bg-transparent"
                asChild
              >
                <Link to="/unidade/burguer-da-hora">Ver Demo ao Vivo</Link>
              </Button>
            </div>

            {/* Social proof chips */}
            <div className="mt-12 flex flex-wrap gap-2 justify-center">
              {proofBadges.map((b) => (
                <span
                  key={b}
                  className="px-3 py-1.5 rounded-full bg-white/10 text-white/70 text-sm font-medium border border-white/10"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              O problema real
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Você já passou por isso?
            </h2>
            <p className="text-muted-foreground text-lg">
              Esses problemas custam dinheiro e clientes todo dia
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {problems.map((p) => (
              <div
                key={p.title}
                className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:border-primary/30 hover:shadow-md transition-all"
              >
                <div className="h-44 overflow-hidden">
                  <img
                    src={p.image}
                    alt={p.alt}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-foreground text-lg mb-2">{p.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{p.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <p className="text-lg font-semibold text-foreground">
              A TrendFood resolve tudo isso. <span className="text-primary">Veja como 👇</span>
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-secondary/40 border-y border-border/60 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              Como funciona
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Três passos simples</h2>
            <p className="text-muted-foreground text-lg">Para ouvir seus clientes e lucrar mais</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 md:gap-0 items-start">
            {steps.map((step, idx) => (
              <div key={step.number} className="flex md:contents">
                <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      {step.icon}
                    </div>
                    <span className="text-4xl font-black text-border">{step.number}</span>
                  </div>
                  <h3 className="font-bold text-foreground text-lg mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                </div>
                {idx < steps.length - 1 && (
                  <div className="hidden md:flex items-center justify-center px-2 self-center">
                    <ChevronRight className="w-6 h-6 text-primary" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <ShowcaseSection />

      {/* Features */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              Tudo em um só lugar
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Funcionalidades completas</h2>
            <p className="text-muted-foreground text-lg">
              Do mural de sugestões ao controle de mesas — sem precisar de vários sistemas
            </p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group bg-card rounded-2xl p-5 border border-border hover:border-primary/40 hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo section */}
      <section id="demo" className="bg-secondary/40 border-y border-border/60 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              Exemplos ao vivo
            </Badge>
            <h2 className="text-3xl font-bold text-foreground mb-3">Veja funcionando agora</h2>
            <p className="text-muted-foreground">Acesse as páginas de demonstração sem precisar criar conta</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto">
            {examples.map((ex) => (
              <Link
                key={ex.slug}
                to={`/unidade/${ex.slug}`}
                className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all"
              >
                <div className="h-36 overflow-hidden">
                  <img
                    src={ex.image}
                    alt={ex.alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4">
                  <span className="font-semibold text-foreground group-hover:text-primary transition-colors block">
                    {ex.name}
                  </span>
                  <span className="text-xs text-muted-foreground">/unidade/{ex.slug}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative overflow-hidden py-24 px-4" style={{ background: "linear-gradient(135deg, #7a0c0c 0%, hsl(0 84% 32%) 100%)" }}>
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
            Pronto para lucrar mais com o que seus clientes já querem?
          </h2>
          <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto">
            Junte-se a centenas de empreendedores. Comece grátis, sem cartão de crédito, em menos de 2 minutos.
          </p>
          <Button
            size="lg"
            className="text-base font-bold gap-2 bg-white text-primary hover:bg-white/90 shadow-xl"
            asChild
          >
            <Link to="/auth">
              Começar a Lucrar Agora
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <p className="mt-4 text-white/40 text-sm">Sem cartão de crédito · Cancele quando quiser</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-8 px-4 text-center text-muted-foreground text-sm bg-background">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <ChefHat className="w-3 h-3 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">TrendFood</span>
        </div>
        <p>© 2025 TrendFood. Feito com ❤️ para o food service brasileiro.</p>
      </footer>
    </div>
  );
};

export default Index;
