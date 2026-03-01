import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Lock, Zap, MessageCircle, Printer, Compass, Wallet,
  Flame, Tag, BarChart2, BellRing, Building2, UtensilsCrossed,
  TableProperties, History, ListPlus, CreditCard, Package,
} from "lucide-react";

type MinPlan = "free" | "pro" | "enterprise" | "lifetime";

interface FeatureItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  minPlan: MinPlan;
  status: "available" | "beta" | "coming_soon";
}

const FEATURES: FeatureItem[] = [
  {
    icon: <UtensilsCrossed className="w-5 h-5" />,
    title: "Cardápio Digital",
    description: "Crie e gerencie seu cardápio online com categorias, fotos e preços.",
    minPlan: "free",
    status: "available",
  },
  {
    icon: <TableProperties className="w-5 h-5" />,
    title: "Mesas & QR Codes",
    description: "Crie mesas e gere QR Codes para os clientes fazerem pedidos.",
    minPlan: "free",
    status: "available",
  },
  {
    icon: <History className="w-5 h-5" />,
    title: "Histórico de Pedidos",
    description: "Consulte todos os pedidos anteriores da sua loja.",
    minPlan: "free",
    status: "available",
  },
  {
    icon: <MessageCircle className="w-5 h-5" />,
    title: "Suporte via WhatsApp",
    description: "Receba notificações e comunique-se com clientes pelo WhatsApp.",
    minPlan: "free",
    status: "available",
  },
  {
    icon: <Compass className="w-5 h-5" />,
    title: "Onboarding Guiado",
    description: "Assistente passo a passo para configurar sua loja rapidamente.",
    minPlan: "free",
    status: "available",
  },
  {
    icon: <Flame className="w-5 h-5" />,
    title: "Cozinha / KDS",
    description: "Painel de produção em tempo real para a cozinha gerenciar pedidos.",
    minPlan: "pro",
    status: "available",
  },
  {
    icon: <BellRing className="w-5 h-5" />,
    title: "Painel do Garçom",
    description: "Controle de pedidos e mesas pelo painel dedicado ao garçom.",
    minPlan: "pro",
    status: "available",
  },
  {
    icon: <Wallet className="w-5 h-5" />,
    title: "Controle de Caixa",
    description: "Abertura, fechamento de caixa e registro de sangrias.",
    minPlan: "pro",
    status: "available",
  },
  {
    icon: <Tag className="w-5 h-5" />,
    title: "Cupons de Desconto",
    description: "Crie cupons promocionais para atrair e fidelizar clientes.",
    minPlan: "pro",
    status: "available",
  },
  {
    icon: <BarChart2 className="w-5 h-5" />,
    title: "Mais Vendidos",
    description: "Relatórios de vendas e ranking dos itens mais populares.",
    minPlan: "pro",
    status: "available",
  },
  {
    icon: <ListPlus className="w-5 h-5" />,
    title: "Adicionais",
    description: "Adicione opções extras aos itens do cardápio (bordas, tamanhos, acompanhamentos).",
    minPlan: "pro",
    status: "available",
  },
  {
    icon: <CreditCard className="w-5 h-5" />,
    title: "Pagamento Online",
    description: "Aceite pagamentos via PIX e cartão de crédito diretamente pelo cardápio digital.",
    minPlan: "pro",
    status: "available",
  },
  {
    icon: <Printer className="w-5 h-5" />,
    title: "Impressora Térmica",
    description: "Imprima pedidos automaticamente na cozinha via impressora térmica.",
    minPlan: "pro",
    status: "beta",
  },
  {
    icon: <Building2 className="w-5 h-5" />,
    title: "Multi-unidade",
    description: "Gerencie várias unidades da sua operação em um só painel.",
    minPlan: "enterprise",
    status: "available",
  },
  {
    icon: <Package className="w-5 h-5" />,
    title: "Gestão de Insumos",
    description: "Controle estoque de ingredientes com baixa automática a cada venda.",
    minPlan: "enterprise",
    status: "available",
  },
  {
    icon: <BarChart2 className="w-5 h-5" />,
    title: "Relatórios Avançados",
    description: "Gráficos de faturamento, ticket médio, horários de pico e comparativos.",
    minPlan: "enterprise",
    status: "available",
  },
  {
    icon: <Compass className="w-5 h-5" />,
    title: "Integração com Delivery",
    description: "Receba e gerencie pedidos de delivery diretamente pelo painel.",
    minPlan: "enterprise",
    status: "coming_soon",
  },
];

const PLAN_CONFIG: Record<MinPlan, { label: string; className: string }> = {
  free: { label: "Todos", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" },
  pro: { label: "Pro+", className: "bg-primary/15 text-primary border-primary/20" },
  enterprise: { label: "Enterprise", className: "bg-purple-500/15 text-purple-600 border-purple-500/20" },
  lifetime: { label: "Enterprise", className: "bg-purple-500/15 text-purple-600 border-purple-500/20" },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  available: { label: "Disponível", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" },
  beta: { label: "Beta", className: "bg-amber-500/15 text-amber-600 border-amber-500/20" },
  coming_soon: { label: "Em breve", className: "bg-muted text-muted-foreground border-border" },
};

const PLAN_RANK: Record<MinPlan, number> = { free: 0, pro: 1, enterprise: 2, lifetime: 2 };

interface FeaturesTabProps {
  effectivePlan: MinPlan;
}

export default function FeaturesTab({ effectivePlan }: FeaturesTabProps) {
  const hasAccess = (minPlan: MinPlan) => PLAN_RANK[effectivePlan] >= PLAN_RANK[minPlan];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Funcionalidades</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Veja todas as funcionalidades da plataforma e o que está disponível no seu plano.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => {
          const unlocked = hasAccess(f.minPlan);
          const planCfg = PLAN_CONFIG[f.minPlan];
          const statusCfg = STATUS_CONFIG[f.status];

          return (
            <Card key={f.title} className={`relative overflow-hidden transition-all ${!unlocked ? "opacity-70" : ""}`}>
              {!unlocked && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <Button asChild size="sm" className="gap-1.5">
                    <Link to="/planos">
                      <Zap className="w-3.5 h-3.5" />
                      Fazer upgrade
                    </Link>
                  </Button>
                </div>
              )}
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    {f.icon}
                  </div>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${planCfg.className}`}>
                      {planCfg.label}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusCfg.className}`}>
                      {statusCfg.label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">{f.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
