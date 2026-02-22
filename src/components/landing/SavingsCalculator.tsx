import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ArrowRight, TrendingDown, ShieldCheck, Calculator } from "lucide-react";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const PRESETS = [5000, 10000, 20000, 50000];

const SavingsCalculator = () => {
  const [revenue, setRevenue] = useState(10000);

  const lossMin = revenue * 0.12;
  const lossMax = revenue * 0.27;
  const lossPercent = Math.round((lossMax / revenue) * 100) || 0;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    setRevenue(parseInt(digits || "0", 10));
  }

  const display = revenue.toLocaleString("pt-BR");

  return (
    <section className="relative py-16 px-4 overflow-hidden">
      {/* Dark premium background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(20,14%,6%)] via-[hsl(20,14%,10%)] to-[hsl(0,84%,12%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(0,84%,52%,0.08),transparent_60%)]" />

      <div className="relative max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge className="mb-5 bg-white/10 text-white/80 border-white/10 backdrop-blur-sm">
            <Calculator className="w-3 h-3 mr-1" />
            Calculadora de economia
          </Badge>
          <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-3 tracking-tight">
            Quanto você <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-500">perde</span> por mês?
          </h2>
          <p className="text-white/60 text-lg max-w-md mx-auto">
            Veja quanto do seu faturamento vai direto pro marketplace
          </p>
        </div>

        {/* Calculator Card - glass morphism */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5 md:p-8 shadow-2xl">
          {/* Input */}
          <label htmlFor="revenue" className="block text-sm font-medium text-white/70 mb-2 tracking-wide uppercase">
            Faturamento mensal no iFood
          </label>
          <div className="relative mb-4">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-bold text-white/40 select-none">
              R$
            </span>
            <input
              id="revenue"
              type="text"
              inputMode="numeric"
              value={display}
              onChange={handleChange}
              className="w-full h-14 rounded-2xl border border-white/10 bg-white/[0.06] pl-14 pr-5 text-2xl font-extrabold text-white placeholder:text-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-all"
            />
          </div>

          {/* Slider */}
          <Slider
            value={[revenue]}
            onValueChange={([v]) => setRevenue(v)}
            min={1000}
            max={100000}
            step={1000}
            className="mb-5 [&_[data-radix-slider-track]]:bg-white/10 [&_[data-radix-slider-range]]:bg-gradient-to-r [&_[data-radix-slider-range]]:from-primary [&_[data-radix-slider-range]]:to-red-400 [&_[data-radix-slider-thumb]]:border-primary [&_[data-radix-slider-thumb]]:bg-white"
          />

          {/* Preset chips */}
          <div className="flex flex-wrap gap-2 mb-6">
            {PRESETS.map((v) => (
              <button
                key={v}
                onClick={() => setRevenue(v)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  revenue === v
                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                    : "bg-white/[0.06] text-white/60 hover:bg-white/10 hover:text-white border border-white/10"
                }`}
              >
                {formatBRL(v)}
              </button>
            ))}
          </div>

          {/* Loss block */}
          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] backdrop-blur-sm p-5 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-400" />
              </div>
              <p className="text-sm font-medium text-white/60">Você perde para o marketplace</p>
            </div>

            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-2xl md:text-3xl font-extrabold text-red-400 tabular-nums transition-all duration-300">
                {formatBRL(lossMin)}
              </span>
              <span className="text-white/40 text-lg font-medium">a</span>
              <span className="text-2xl md:text-3xl font-extrabold text-red-400 tabular-nums transition-all duration-300">
                {formatBRL(lossMax)}
              </span>
              <span className="text-white/30 text-sm">/mês</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500 ease-out"
                style={{ width: `${Math.min(lossPercent, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-white/30">12% de taxa</span>
              <span className="text-xs text-red-400/80 font-semibold">até {lossPercent}% do seu faturamento</span>
            </div>
          </div>

          {/* TrendFood savings block */}
          <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-green-500 via-emerald-400 to-yellow-400 mb-6">
            <div className="rounded-2xl bg-[hsl(20,14%,8%)] p-5 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-green-400" />
                </div>
                <p className="text-sm font-medium text-white/70">Com o TrendFood</p>
              </div>
              <p className="text-2xl md:text-3xl font-extrabold mb-2">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-300 to-yellow-300">
                  {formatBRL(revenue)} fica com você
                </span>
              </p>
              <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-sm font-bold">
                0% de comissão sobre vendas
              </Badge>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/90 text-base font-bold gap-2 shadow-xl shadow-white/10 h-12 px-8"
              asChild
            >
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
