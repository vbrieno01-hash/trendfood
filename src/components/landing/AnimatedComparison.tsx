import { useEffect, useRef } from "react";
import { motion, useInView, useMotionValue, animate } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Check, X, TrendingDown, TrendingUp } from "lucide-react";

interface ComparisonRow { label: string; marketplace: string; trendfood: string; badge?: string; }
interface Props { rows: ComparisonRow[]; }

export default function AnimatedComparison({ rows }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const inView = useInView(barsRef, { once: true, margin: "-20%" });

  return (
    <section id="comparativo" ref={ref} className="py-20 md:py-28 px-4 bg-cream">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <div className="hairline-accent mx-auto mb-5" />
          <h2 className="font-display font-bold text-4xl md:text-5xl text-ink mb-3 tracking-tight">
            TrendFood <span className="text-ink-muted font-normal">vs</span> Marketplaces
          </h2>
          <p className="text-ink-muted text-lg">Veja por que centenas de negócios estão migrando</p>
        </div>

        {/* Animated bars hero */}
        <div ref={barsRef} className="grid md:grid-cols-2 gap-8 mb-16 items-end max-w-3xl mx-auto">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm font-display font-bold uppercase tracking-wider">
              <span className="text-ink-muted flex items-center gap-1.5"><TrendingDown className="w-4 h-4" /> Marketplace</span>
              <CountUpDisplay to={27} suffix="% taxa" className="text-ink-muted" trigger={inView} />
            </div>
            <div className="relative h-64 rounded-2xl border border-cream overflow-hidden" style={{ background: "hsl(var(--landing-surface) / 0.35)" }}>
              <motion.div
                initial={{ height: "0%" }}
                animate={inView ? { height: "27%" } : { height: "0%" }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
                className="absolute bottom-0 left-0 right-0"
                style={{ background: "hsl(var(--landing-ink))" }}
              />
              <div className="absolute inset-0 flex items-end justify-center pb-4">
                <X className="w-10 h-10 text-white drop-shadow-lg" />
              </div>
            </div>
            <p className="text-xs text-ink-muted text-center">do seu faturamento vai pra eles</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm font-display font-bold uppercase tracking-wider">
              <span className="text-accent flex items-center gap-1.5"><TrendingUp className="w-4 h-4" /> TrendFood</span>
              <CountUpDisplay to={100} suffix="% pra você" className="text-accent" trigger={inView} />
            </div>
            <div className="relative h-64 rounded-2xl border overflow-hidden border-accent" style={{ background: "hsl(var(--landing-surface) / 0.35)" }}>
              <motion.div
                initial={{ height: "0%" }}
                animate={inView ? { height: "100%" } : { height: "0%" }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
                className="absolute bottom-0 left-0 right-0"
                style={{ background: "hsl(var(--landing-accent))" }}
              />
              <div className="absolute inset-0 flex items-end justify-center pb-4">
                <Check className="w-10 h-10 text-white drop-shadow-lg" />
              </div>
            </div>
            <p className="text-xs text-ink-muted text-center">do seu faturamento fica com você</p>
          </div>
        </div>

        {/* Detailed table */}
        <div className="hidden md:block rounded-2xl border border-cream overflow-hidden shadow-[0_20px_60px_-30px_hsl(24_60%_25%/0.2)] bg-white">
          <div className="grid grid-cols-[1fr_1.2fr_1.3fr]" style={{ background: "hsl(var(--landing-surface) / 0.4)" }}>
            <div className="p-4 font-display font-bold text-ink-muted text-sm uppercase tracking-wider" />
            <div className="p-4 text-center font-display font-bold text-ink-muted text-sm uppercase tracking-wider border-l border-cream">Marketplaces</div>
            <div className="p-4 text-center font-display font-bold text-white text-sm uppercase tracking-wider border-l border-cream" style={{ background: "hsl(var(--landing-accent))" }}>TrendFood</div>
          </div>
          {rows.map((row, i) => (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className={`grid grid-cols-[1fr_1.2fr_1.3fr] ${i < rows.length - 1 ? "border-b border-cream" : ""}`}
            >
              <div className="p-4 font-medium text-ink text-sm flex items-center">{row.label}</div>
              <div className="p-4 border-l border-cream flex items-center justify-center gap-2">
                <X className="w-4 h-4 text-ink-muted shrink-0" />
                <span className="text-sm text-ink-muted text-center">{row.marketplace}</span>
              </div>
              <div className="p-4 border-l border-cream flex items-center justify-center gap-2" style={{ background: "hsl(var(--landing-accent) / 0.08)" }}>
                <Check className="w-4 h-4 text-accent shrink-0" />
                <span className="text-sm text-ink font-semibold text-center">{row.trendfood}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="rounded-xl border border-cream overflow-hidden bg-white">
              <div className="p-3 font-display font-bold text-ink text-sm" style={{ background: "hsl(var(--landing-surface) / 0.5)" }}>{row.label}</div>
              <div className="grid grid-cols-2">
                <div className="p-3 flex flex-col items-center gap-1">
                  <X className="w-4 h-4 text-ink-muted" />
                  <span className="text-xs text-ink-muted text-center">{row.marketplace}</span>
                </div>
                <div className="p-3 border-l border-cream flex flex-col items-center gap-1" style={{ background: "hsl(var(--landing-accent) / 0.08)" }}>
                  <Check className="w-4 h-4 text-accent" />
                  <span className="text-xs text-ink font-semibold text-center">{row.trendfood}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CountUpDisplay({ to, suffix, className, trigger }: { to: number; suffix: string; className?: string; trigger: boolean }) {
  const count = useMotionValue(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!trigger) return;
    const controls = animate(count, to, {
      duration: 1.2,
      ease: "easeOut",
      delay: 0.1,
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = String(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [trigger, to, count]);

  return (
    <span className={`tabular-nums ${className ?? ""}`}>
      <span ref={ref}>0</span>
      {suffix}
    </span>
  );
}