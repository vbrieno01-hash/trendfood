import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const PRESETS = [5000, 10000, 20000, 50000];

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
    <section className="relative py-24 px-4">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] to-[#111]" />

      <div className="relative max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-semibold text-white mb-4 tracking-tight">
            Quanto você <span className="text-red-500">perde</span> por mês?
          </h2>
          <p className="text-white/40 text-base">
            Veja quanto do seu faturamento vai direto pro marketplace
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 md:p-12">
          {/* Input */}
          <label htmlFor="revenue" className="block text-xs font-medium text-white/30 mb-6 tracking-widest uppercase">
            Faturamento mensal no iFood
          </label>
          <div className="relative mb-2">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-medium text-white/20 select-none">
              R$
            </span>
            <input
              id="revenue"
              type="text"
              inputMode="numeric"
              value={display}
              onChange={handleChange}
              className="w-full bg-transparent border-b border-white/10 pl-12 pb-3 text-3xl font-medium text-white placeholder:text-white/10 focus-visible:outline-none focus-visible:border-white/30 transition-colors"
            />
          </div>

          {/* Slider */}
          <input
            type="range"
            min={1000}
            max={100000}
            step={1000}
            value={revenue}
            onChange={(e) => setRevenue(Number(e.target.value))}
            className="w-full h-[2px] mt-6 mb-8 appearance-none bg-white/[0.08] rounded-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
          />

          {/* Preset chips */}
          <div className="flex flex-wrap gap-3 mb-12">
            {PRESETS.map((v) => (
              <button
                key={v}
                onClick={() => setRevenue(v)}
                className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                  revenue === v
                    ? "bg-white/10 text-white"
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                {formatBRL(v)}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.06]" />

          {/* Loss block */}
          <div className="py-8">
            <p className="text-xs font-medium text-white/30 tracking-widest uppercase mb-4">
              Você perde para o marketplace
            </p>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-3xl md:text-4xl font-semibold text-red-500 tabular-nums">
                {formatBRL(lossMin)}
              </span>
              <span className="text-white/20 text-lg">a</span>
              <span className="text-3xl md:text-4xl font-semibold text-red-500 tabular-nums">
                {formatBRL(lossMax)}
              </span>
              <span className="text-white/20 text-sm">/mês</span>
            </div>
            <p className="text-sm text-white/25">12% a 27% de taxa sobre vendas</p>
          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.06]" />

          {/* TrendFood block */}
          <div className="py-8">
            <p className="text-xs font-medium text-white/30 tracking-widest uppercase mb-4">
              Com o TrendFood
            </p>
            <p className="text-3xl md:text-4xl font-semibold text-emerald-400 tabular-nums mb-2">
              {formatBRL(revenue)} <span className="text-white/40 text-lg font-normal">fica com você</span>
            </p>
            <p className="text-sm text-emerald-400/60">0% de comissão sobre vendas</p>
          </div>

          {/* CTA */}
          <div className="pt-4">
            <Link
              to="/auth"
              className="inline-flex items-center justify-center gap-2 bg-white text-black rounded-lg h-12 px-8 text-base font-medium hover:bg-white/90 transition-colors w-full md:w-auto"
            >
              Começar Grátis
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SavingsCalculator;
