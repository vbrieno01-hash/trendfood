import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const PRESETS = [5000, 10000, 20000, 50000];

function charMinWidth(c: string): string {
  if (/\d/.test(c)) return "0.55em";
  if (c === "R" || c === "$") return "0.6em";
  if (c === "." || c === ",") return "0.25em";
  if (c === " " || c === "\u00A0") return "0.3em";
  return "0.5em";
}

function FlipNumber({ value }: { value: string }) {
  return (
    <span className="inline-flex overflow-hidden tabular-nums">
      {value.split("").map((c, i) => (
        <span key={`${i}-${c}`} className="relative inline-block" style={{ height: "1em", minWidth: charMinWidth(c) }}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={c}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {c}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
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
    <section id="calculadora" className="relative py-16 md:py-24 px-4 overflow-hidden" style={{ background: "hsl(var(--landing-bg))" }}>
      {/* Blob radial cream/laranja atrás do número de destaque */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full opacity-60 pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--landing-surface) / 0.9), transparent 60%)" }}
      />

      <div className="relative max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="hairline-accent mx-auto mb-5" />
          <h2 className="font-display font-bold text-4xl md:text-5xl mb-3 tracking-tight" style={{ color: "hsl(var(--landing-ink))" }}>
            Quanto você <span style={{ color: "hsl(var(--landing-accent))" }}>perde</span> por mês?
          </h2>
          <p className="text-base" style={{ color: "hsl(var(--landing-ink) / 0.65)" }}>
            Veja quanto do seu faturamento vai direto pro marketplace
          </p>
        </div>

        {/* Card papel branco */}
        <div
          className="rounded-3xl p-8 md:p-12 shadow-[0_30px_80px_-30px_hsl(24_60%_25%/0.25)]"
          style={{ background: "#fff", border: "1px solid hsl(var(--landing-surface))" }}
        >
          {/* Input */}
          <label htmlFor="revenue" className="block text-xs font-bold mb-4 tracking-widest uppercase" style={{ color: "hsl(var(--landing-ink) / 0.55)" }}>
            Faturamento mensal em marketplaces
          </label>
          <div className="relative mb-2">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-display font-bold select-none" style={{ color: "hsl(var(--landing-ink) / 0.4)" }}>
              R$
            </span>
            <input
              id="revenue"
              type="text"
              inputMode="numeric"
              value={display}
              onChange={handleChange}
              className="w-full bg-transparent pl-12 pb-3 text-3xl md:text-4xl font-display font-bold focus-visible:outline-none transition-colors"
              style={{
                color: "hsl(var(--landing-ink))",
                borderBottom: "2px solid hsl(var(--landing-surface))",
              }}
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
            className="w-full h-1 mt-8 mb-8 appearance-none rounded-full cursor-pointer accent-[hsl(var(--landing-accent))]"
            style={{ background: "hsl(var(--landing-surface))" }}
          />

          {/* Preset chips */}
          <div className="flex flex-wrap gap-2 mb-10">
            {PRESETS.map((v) => (
              <button
                key={v}
                onClick={() => setRevenue(v)}
                className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                style={
                  revenue === v
                    ? { background: "hsl(var(--landing-accent))", color: "#fff" }
                    : { background: "hsl(var(--landing-surface) / 0.5)", color: "hsl(var(--landing-ink) / 0.7)" }
                }
              >
                {formatBRL(v)}
              </button>
            ))}
          </div>

          <div style={{ borderTop: "1px solid hsl(var(--landing-surface))" }} />

          {/* Loss block — número gigante em Space Grotesk laranja */}
          <div className="py-8 text-center">
            <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "hsl(var(--landing-ink) / 0.55)" }}>
              Você perde para o marketplace
            </p>
            <div className="flex items-baseline gap-2 justify-center flex-wrap font-display font-bold tabular-nums leading-none" style={{ color: "hsl(var(--landing-accent))" }}>
              <span className="text-5xl md:text-7xl">
                <FlipNumber value={formatBRL(lossMin)} />
              </span>
              <span className="text-2xl opacity-50">a</span>
              <span className="text-5xl md:text-7xl">
                <FlipNumber value={formatBRL(lossMax)} />
              </span>
            </div>
            <p className="text-sm mt-3" style={{ color: "hsl(var(--landing-ink) / 0.55)" }}>12% a 27% de taxa sobre vendas / mês</p>
          </div>

          <div style={{ borderTop: "1px solid hsl(var(--landing-surface))" }} />

          {/* TrendFood block */}
          <div className="py-8 text-center">
            <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "hsl(var(--landing-ink) / 0.55)" }}>
              Com o TrendFood
            </p>
            <p className="font-display font-bold text-4xl md:text-5xl tabular-nums mb-2" style={{ color: "hsl(var(--landing-ink))" }}>
              <FlipNumber value={formatBRL(revenue)} />
            </p>
            <p className="text-sm font-semibold" style={{ color: "hsl(var(--landing-accent))" }}>
              100% fica com você · 0% de comissão
            </p>
          </div>

          {/* CTA */}
          <div className="pt-4">
            <Link
              to="/auth"
              className="inline-flex items-center justify-center gap-2 rounded-full h-14 px-8 text-base font-display font-bold transition-transform hover:-translate-y-0.5 w-full md:w-auto shadow-[0_15px_35px_-10px_hsl(24_95%_45%/0.55)]"
              style={{ background: "hsl(var(--landing-accent))", color: "#fff" }}
            >
              Começar Grátis Agora
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SavingsCalculator;
