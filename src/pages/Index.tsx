import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ShowcaseSection from "@/components/landing/ShowcaseSection";
import logoIcon from "@/assets/logo-icon.png";
import {
  BarChart3,
  Zap,
  ArrowRight,
  QrCode,
  UtensilsCrossed,
  TrendingUp,
  ChevronRight,
  Flame,
  BellRing,
  Wallet,
  Tag,
  Printer,
  BarChart2,
} from "lucide-react";

const problems = [
  {
    image: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=600&q=80",
    alt: "Pedido em papel no atendimento",
    title: "Pedido em papel e confusão no atendimento",
    description:
      "Pedido que chega por papelzinho e se perde — atendente sem saber a fila, item errado, cliente insatisfeito.",
  },
  {
    image: "https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=600&q=80",
    alt: "Cliente esperando conta",
    title: "Clientes esperando para pagar",
    description:
      "Fila parada esperando atendente com maquininha, sem conseguir fechar a conta. Rotatividade baixa, lucro menor.",
  },
  {
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80",
    alt: "Planilha de controle financeiro",
    title: "Sem controle do que vende",
    description:
      "Fim do mês sem saber qual produto vendeu mais, qual dia faturou menos, quanto entrou no caixa. Decisões no escuro.",
  },
];

const steps = [
  {
    number: "01",
    icon: <UtensilsCrossed className="w-6 h-6" />,
    title: "Crie seu catálogo online",
    description:
      "Monte categorias, preços e fotos em minutos. Seu catálogo fica disponível via link para qualquer dispositivo, sem precisar baixar nenhum app.",
  },
  {
    number: "02",
    icon: <QrCode className="w-6 h-6" />,
    title: "Gere QR Codes para cada ponto de atendimento",
    description:
      "Cada ponto recebe um QR Code único. O cliente escaneia e faz o pedido direto pelo celular, sem precisar chamar o atendente.",
  },
  {
    number: "03",
    icon: <Flame className="w-6 h-6" />,
    title: "Equipe recebe o pedido em tempo real",
    description:
      "O painel de produção (KDS) toca um alerta sonoro e imprime automaticamente cada pedido. A equipe acompanha tudo no painel.",
  },
  {
    number: "04",
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Feche o caixa com relatório completo",
    description:
      "Abertura e fechamento de turno, registro de sangrias e conferência de saldo. Veja faturamento e mais vendidos do dia.",
  },
];

const features = [
  {
    icon: <UtensilsCrossed className="w-5 h-5" />,
    title: "Catálogo Digital",
    description: "Monte seu catálogo com categorias, preços e fotos. Acessível via link ou QR Code.",
  },
  {
    icon: <QrCode className="w-5 h-5" />,
    title: "Pedidos por QR Code",
    description: "Cada ponto de atendimento tem QR único. O cliente pede sem precisar de app.",
  },
  {
    icon: <Flame className="w-5 h-5" />,
    title: "Painel de Produção (KDS)",
    description: "Tela dedicada ao atendimento com alerta sonoro e impressão automática.",
  },
  {
    icon: <BellRing className="w-5 h-5" />,
    title: "Painel do Atendente",
    description: "Visão de todos os pedidos ativos e fechamento de conta com PIX integrado.",
  },
  {
    icon: <Wallet className="w-5 h-5" />,
    title: "Controle de Caixa",
    description: "Abra e feche turnos, registre sangrias e confira o saldo ao final.",
  },
  {
    icon: <BarChart2 className="w-5 h-5" />,
    title: "Mais Vendidos",
    description: "Ranking de produtos por período com receita gerada por cada item.",
  },
  {
    icon: <Tag className="w-5 h-5" />,
    title: "Cupons de Desconto",
    description: "Crie promoções com valor fixo ou percentual e gerencie o uso.",
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: "Faturamento em Tempo Real",
    description: "Dashboard com gráfico dos últimos 7 dias, ticket médio e total do dia.",
  },
  {
    icon: <Printer className="w-5 h-5" />,
    title: "Impressora Térmica",
    description: "Impressão automática 80mm com QR Code PIX no recibo do cliente.",
  },
];


const proofBadges = [
  "Catálogo Digital",
  "Pedido por QR Code",
  "Atendimento em Tempo Real",
  "Sem app para instalar",
  "PIX integrado",
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-screen flex flex-col">
        {/* Background photo */}
        <img
          src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&q=80"
          alt="Restaurante movimentado com mesas e clientes"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Overlay */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, rgba(26,5,5,0.93) 0%, rgba(45,10,10,0.89) 40%, rgba(26,5,5,0.96) 100%)" }}
        />

        {/* Header */}
        <header className="relative z-10 border-b border-white/10">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={logoIcon} alt="TrendFood" className="w-8 h-8 rounded-lg object-contain" />
              <span className="font-bold text-white text-lg">TrendFood</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10" asChild>
                <Link to="/planos">Ver planos</Link>
              </Button>
              <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white bg-transparent" asChild>
                <Link to="/auth">Entrar</Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex items-center">
          <div className="max-w-5xl mx-auto px-4 py-20 text-center w-full">
            <Badge className="mb-6 bg-primary/20 text-red-300 border-primary/30 hover:bg-primary/20">
              <Zap className="w-3 h-3 mr-1" />
              Sistema completo para qualquer negócio
            </Badge>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight tracking-tight">
              Gerencie seu negócio{" "}
              <span className="text-primary">inteiro.</span>
              <br />
              Do pedido ao caixa.
            </h1>

            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-4 leading-relaxed">
              Catálogo digital, pedidos por QR Code, atendimento integrado, controle de caixa e relatórios — tudo em um só lugar, sem papel e sem app para instalar.
            </p>
            <p className="text-sm md:text-base text-white/50 max-w-xl mx-auto mb-10 leading-relaxed">
              Comece grátis em menos de 2 minutos. Seu negócio mais organizado a partir de hoje.
            </p>

            <div className="flex justify-center">
              <Button size="lg" className="text-base font-bold gap-2 shadow-lg shadow-primary/40" asChild>
                <Link to="/auth">
                  Começar Grátis
                  <ArrowRight className="w-4 h-4" />
                </Link>
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
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Quatro passos simples</h2>
            <p className="text-muted-foreground text-lg">Do cardápio ao fechamento do caixa, tudo integrado</p>
          </div>
          <div className="grid md:grid-cols-4 gap-4 md:gap-0 items-start">
            {steps.map((step, idx) => (
              <div key={step.number} className="flex md:contents">
                <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      {step.icon}
                    </div>
                    <span className="text-4xl font-black text-border">{step.number}</span>
                  </div>
                  <h3 className="font-bold text-foreground text-base mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                </div>
                {idx < steps.length - 1 && (
                  <div className="hidden md:flex items-center justify-center px-1 self-center">
                    <ChevronRight className="w-5 h-5 text-primary" />
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
              Do cardápio digital ao controle de caixa — sem precisar de vários sistemas
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

      {/* CTA final */}
      <section className="relative overflow-hidden py-24 px-4" style={{ background: "linear-gradient(135deg, #7a0c0c 0%, hsl(0 84% 32%) 100%)" }}>
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
            Seu negócio mais organizado a partir de hoje
          </h2>
          <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto">
            Sem papel, sem confusão, sem app para baixar. Cadastre-se grátis e configure em minutos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              className="text-base font-bold gap-2 bg-white text-primary hover:bg-white/90 shadow-xl"
              asChild
            >
              <Link to="/auth">
                Começar Grátis Agora
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base font-bold border-white/30 text-white hover:bg-white/10 hover:text-white bg-transparent"
              asChild
            >
              <Link to="/planos">Ver planos</Link>
            </Button>
          </div>
          <p className="mt-4 text-white/40 text-sm">Sem cartão de crédito · Cancele quando quiser</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-8 px-4 text-center text-muted-foreground text-sm bg-background">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src={logoIcon} alt="TrendFood" className="w-6 h-6 rounded-md object-contain" />
          <span className="font-semibold text-foreground">TrendFood</span>
        </div>
        <p>© 2025 TrendFood. Feito com ❤️ para o comércio brasileiro.</p>
      </footer>
    </div>
  );
};

export default Index;
