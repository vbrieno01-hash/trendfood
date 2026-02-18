import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChefHat, Heart, BarChart3, Zap, ArrowRight, Star } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: <ChefHat className="w-6 h-6" />,
    title: "Crie seu estabelecimento",
    description: "Cadastre seu negócio em menos de 2 minutos e receba um link exclusivo para compartilhar.",
  },
  {
    number: "02",
    icon: <Heart className="w-6 h-6" />,
    title: "Clientes sugerem e votam",
    description: "Seus clientes acessam a página e enviam ideias de novos lanches — e votam nos favoritos.",
  },
  {
    number: "03",
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Você decide o que lançar",
    description: "No seu painel, veja as sugestões mais populares e coloque as melhores em produção.",
  },
];

const benefits = [
  "Sem instalação de app",
  "Link compartilhável",
  "Votação em tempo real",
  "Painel simples",
  "100% mobile",
  "Dados valiosos",
];

const examples = [
  { slug: "burguer-da-hora", name: "Burguer da Hora", emoji: "🍔" },
  { slug: "pizza-feliz", name: "Pizza Feliz", emoji: "🍕" },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <ChefHat className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground text-lg">TrendFood</span>
          </div>
          <Button size="sm" asChild>
            <Link to="#demo">Ver demo</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-12 text-center">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
          <Zap className="w-3 h-3 mr-1" />
          Novo jeito de ouvir seus clientes
        </Badge>
        <h1 className="text-4xl md:text-6xl font-extrabold text-foreground mb-5 leading-tight tracking-tight">
          Seu cardápio criado
          <br />
          <span className="text-primary">pelos seus clientes</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
          Crie uma página pública para seu estabelecimento. Seus clientes sugerem novos lanches e votam nos favoritos.
          Você lança o que realmente vai vender.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" className="text-base font-semibold gap-2" asChild>
          <Link to="/auth">
              Criar minha conta grátis
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="text-base" asChild>
            <Link to="/unidade/burguer-da-hora">Ver exemplo ao vivo</Link>
          </Button>
        </div>
      </section>

      {/* Benefits chips */}
      <section className="max-w-4xl mx-auto px-4 pb-14">
        <div className="flex flex-wrap gap-2 justify-center">
          {benefits.map((b) => (
            <span
              key={b}
              className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium flex items-center gap-1.5"
            >
              <Star className="w-3 h-3 text-primary fill-primary" />
              {b}
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-secondary/40 border-y border-border/60 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">Como funciona</h2>
            <p className="text-muted-foreground text-lg">Três passos simples para ouvir seus clientes</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step) => (
              <div key={step.number} className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    {step.icon}
                  </div>
                  <span className="text-4xl font-black text-border">{step.number}</span>
                </div>
                <h3 className="font-bold text-foreground text-lg mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo section */}
      <section id="demo" className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-foreground mb-3">Exemplos ao vivo</h2>
          <p className="text-muted-foreground">Acesse as páginas de demonstração abaixo</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto">
          {examples.map((ex) => (
            <Link
              key={ex.slug}
              to={`/unidade/${ex.slug}`}
              className="group bg-card border border-border rounded-2xl p-6 flex flex-col items-center gap-3 hover:border-primary/40 hover:shadow-md transition-all"
            >
              <span className="text-5xl">{ex.emoji}</span>
              <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {ex.name}
              </span>
              <span className="text-xs text-muted-foreground">
                /unidade/{ex.slug}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Pronto para ouvir seus clientes?
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-8">
            Comece grátis hoje. Nenhum cartão de crédito necessário.
          </p>
          <Button size="lg" variant="secondary" className="text-base font-semibold gap-2" asChild>
          <Link to="/auth">
              Criar minha conta grátis
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-8 px-4 text-center text-muted-foreground text-sm">
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
