import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

const rows = [
  {
    label: "Comissão por venda",
    marketplace: "12% a 27%",
    trendfood: "0%",
    trendfoodBadge: "Grátis",
  },
  {
    label: "Dados dos clientes",
    marketplace: "Ficam com a plataforma",
    trendfood: "São seus",
  },
  {
    label: "Cardápio",
    marketplace: "Padronizado",
    trendfood: "Personalizado",
  },
  {
    label: "Delivery",
    marketplace: "Motoboy da plataforma (caro)",
    trendfood: "Seus motoboys, suas regras",
  },
  {
    label: "Impressão de pedidos",
    marketplace: "Não tem",
    trendfood: "Impressora térmica integrada",
    trendfoodBadge: "Incluso",
  },
  {
    label: "Controle de caixa",
    marketplace: "Não tem",
    trendfood: "Completo com abertura/fechamento",
    trendfoodBadge: "Incluso",
  },
  {
    label: "Custo mensal",
    marketplace: "Comissão variável",
    trendfood: "A partir de R$ 0/mês",
    trendfoodBadge: "Grátis",
  },
];

const ComparisonSection = () => {
  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            Compare e decida
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            TrendFood vs Marketplaces
          </h2>
          <p className="text-muted-foreground text-lg">
            Veja por que centenas de negócios estão migrando
          </p>
        </div>

        <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
          {/* Header */}
          <div className="grid grid-cols-3 bg-muted/60">
            <div className="p-4 font-semibold text-muted-foreground text-sm" />
            <div className="p-4 text-center font-bold text-destructive text-sm border-l border-border">
              Marketplaces (iFood, etc)
            </div>
            <div className="p-4 text-center font-bold text-primary text-sm border-l border-border">
              TrendFood
            </div>
          </div>

          {/* Rows */}
          {rows.map((row, i) => (
            <div
              key={row.label}
              className={`grid grid-cols-3 ${i < rows.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="p-4 font-medium text-foreground text-sm flex items-center">
                {row.label}
              </div>
              <div className="p-4 border-l border-border flex items-center justify-center gap-2 bg-destructive/5">
                <X className="w-4 h-4 text-destructive shrink-0" />
                <span className="text-sm text-muted-foreground text-center">
                  {row.marketplace}
                </span>
              </div>
              <div className="p-4 border-l border-border flex items-center justify-center gap-2 bg-green-500/5">
                <Check className="w-4 h-4 text-green-600 shrink-0" />
                <span className="text-sm text-foreground font-medium text-center">
                  {row.trendfood}
                </span>
                {row.trendfoodBadge && (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200 shrink-0">
                    {row.trendfoodBadge}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;
