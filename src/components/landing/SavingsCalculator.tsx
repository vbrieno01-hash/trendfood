import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calculator } from "lucide-react";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const SavingsCalculator = () => {
  const [revenue, setRevenue] = useState(10000);

  const lossMin = revenue * 0.12;
  const lossMax = revenue * 0.27;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    setRevenue(parseInt(digits || "0", 10));
  }

  const display = revenue.toLocaleString("pt-BR");

  return (
    <section className="py-20 px-4 bg-secondary/40 border-y border-border/60">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            <Calculator className="w-3 h-3 mr-1" />
            Calculadora de economia
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Quanto você perde por mês?
          </h2>
          <p className="text-muted-foreground text-lg">
            Digite seu faturamento mensal e veja quanto vai para o marketplace
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 md:p-8">
          <label htmlFor="revenue" className="block text-sm font-medium text-foreground mb-2">
            Quanto você fatura por mês no iFood?
          </label>
          <div className="relative mb-8">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground select-none">
              R$
            </span>
            <input
              id="revenue"
              type="text"
              inputMode="numeric"
              value={display}
              onChange={handleChange}
              className="w-full h-14 rounded-xl border border-input bg-background pl-12 pr-4 text-2xl font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-5 text-center">
              <p className="text-sm text-muted-foreground mb-1">Você perde no mínimo</p>
              <p className="text-3xl font-extrabold text-destructive">{formatBRL(lossMin)}</p>
              <p className="text-xs text-muted-foreground mt-1">com taxa de 12%</p>
            </div>
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-5 text-center">
              <p className="text-sm text-muted-foreground mb-1">Você perde até</p>
              <p className="text-3xl font-extrabold text-destructive">{formatBRL(lossMax)}</p>
              <p className="text-xs text-muted-foreground mt-1">com taxa de 27%</p>
            </div>
          </div>

          <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-5 text-center mb-6">
            <p className="text-sm text-foreground mb-1">Com o TrendFood, esse dinheiro</p>
            <p className="text-3xl font-extrabold text-green-600">fica com você 💰</p>
            <p className="text-xs text-muted-foreground mt-1">0% de comissão sobre vendas</p>
          </div>

          <div className="text-center">
            <Button size="lg" className="text-base font-bold gap-2" asChild>
              <Link to="/auth">
                Começar Grátis
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SavingsCalculator;
