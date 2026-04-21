import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Check, X, TrendingDown, TrendingUp } from "lucide-react";
import { useIsDesktop } from "@/hooks/useIsDesktop";

interface ComparisonRow { label: string; marketplace: string; trendfood: string; badge?: string; }
interface Props { rows: ComparisonRow[]; }

export default function AnimatedComparison({ rows }: Props) {
  const isDesktop = useIsDesktop();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 60%"] });

  const marketplaceHeight = useTransform(scrollYProgress, [0, 1], ["100%", "12%"]);
  const trendHeight = useTransform(scrollYProgress, [0, 1], ["10%", "100%"]);
  const marketplacePct = useTransform(scrollYProgress, (v) => Math.round(27 - v * 27));
  const trendPct = useTransform(scrollYProgress, (v) => Math.round(v * 100));

  return (
    <section id="comparativo" ref={ref} className="py-24 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Compare e decida</Badge>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-3 tracking-tight">TrendFood vs Marketplaces</h2>
          <p className="text-muted-foreground text-lg">Veja por que centenas de negócios estão migrando</p>
        </div>

        {/* Animated bars hero */}
        <div className="grid md:grid-cols-2 gap-8 mb-16 items-end max-w-3xl mx-auto">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm font-bold uppercase tracking-wider">
              <span className="text-destructive flex items-center gap-1.5"><TrendingDown className="w-4 h-4" /> Marketplace</span>
              {isDesktop ? (
                <PercentDisplay value={marketplacePct} suffix="% taxa" className="text-destructive" />
              ) : (
                <span className="tabular-nums text-destructive">27% taxa</span>
              )}
            </div>
            <div className="relative h-64 rounded-2xl border border-destructive/30 overflow-hidden bg-destructive/5">
              {isDesktop ? (
                <motion.div
                  style={{ height: marketplaceHeight }}
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-destructive to-red-500"
                />
              ) : (
                <div
                  style={{ height: "27%" }}
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-destructive to-red-500"
                />
              )}
              <div className="absolute inset-0 flex items-end justify-center pb-4">
                <X className="w-10 h-10 text-white/80 drop-shadow-lg" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">do seu faturamento vai pra eles</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm font-bold uppercase tracking-wider">
              <span className="text-emerald-600 flex items-center gap-1.5"><TrendingUp className="w-4 h-4" /> TrendFood</span>
              {isDesktop ? (
                <PercentDisplay value={trendPct} suffix="% pra você" className="text-emerald-600" />
              ) : (
                <span className="tabular-nums text-emerald-600">100% pra você</span>
              )}
            </div>
            <div className="relative h-64 rounded-2xl border border-emerald-500/30 overflow-hidden bg-emerald-500/5">
              {isDesktop ? (
                <motion.div
                  style={{ height: trendHeight }}
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-600 to-emerald-400"
                />
              ) : (
                <div
                  style={{ height: "100%" }}
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-600 to-emerald-400"
                />
              )}
              <div className="absolute inset-0 flex items-end justify-center pb-4">
                <Check className="w-10 h-10 text-white/90 drop-shadow-lg" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">do seu faturamento fica com você</p>
          </div>
        </div>

        {/* Detailed table */}
        <div className="hidden md:block rounded-2xl border border-border overflow-hidden shadow-sm bg-card">
          <div className="grid grid-cols-[1fr_1.2fr_1.3fr] bg-muted/60">
            <div className="p-4 font-semibold text-muted-foreground text-sm" />
            <div className="p-4 text-center font-bold text-destructive text-sm border-l border-border">Marketplaces</div>
            <div className="p-4 text-center font-bold text-primary text-sm border-l border-border">TrendFood</div>
          </div>
          {rows.map((row, i) => (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className={`grid grid-cols-[1fr_1.2fr_1.3fr] ${i < rows.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="p-4 font-medium text-foreground text-sm flex items-center">{row.label}</div>
              <div className="p-4 border-l border-border flex items-center justify-center gap-2 bg-destructive/5">
                <X className="w-4 h-4 text-destructive shrink-0" />
                <span className="text-sm text-muted-foreground text-center">{row.marketplace}</span>
              </div>
              <div className="p-4 border-l border-border flex items-center justify-center gap-2 bg-orange-500/5">
                <Check className="w-4 h-4 text-orange-500 shrink-0" />
                <span className="text-sm text-foreground font-medium text-center">{row.trendfood}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="rounded-xl border border-border overflow-hidden shadow-sm bg-card">
              <div className="p-3 bg-muted/60 font-semibold text-foreground text-sm">{row.label}</div>
              <div className="grid grid-cols-2">
                <div className="p-3 bg-destructive/5 flex flex-col items-center gap-1">
                  <X className="w-4 h-4 text-destructive" />
                  <span className="text-xs text-muted-foreground text-center">{row.marketplace}</span>
                </div>
                <div className="p-3 bg-orange-500/5 border-l border-border flex flex-col items-center gap-1">
                  <Check className="w-4 h-4 text-orange-500" />
                  <span className="text-xs text-foreground font-medium text-center">{row.trendfood}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PercentDisplay({ value, suffix, className }: { value: any; suffix: string; className?: string }) {
  return (
    <span className={`tabular-nums ${className ?? ""}`}>
      <motion.span>{value}</motion.span>
      {suffix}
    </span>
  );
}