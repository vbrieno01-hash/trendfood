import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Flame, QrCode } from "lucide-react";
import dashboardDesktopAsset from "@/assets/dashboard-desktop.png.asset.json";
import dashboardMobileAsset from "@/assets/dashboard-mobile.png.asset.json";
const dashboardImg = dashboardDesktopAsset.url;
const dashboardMobileImg = dashboardMobileAsset.url;

interface HeroProps {
  badgeText: string;
  title: string;
  titleHighlight: string;
  subtitle: string;
  subtitle2: string;
  ctaText: string;
  proofBadges: string[];
  orderCount: number;
  displayCount: number;
  orderCounterText: string;
  heroImageUrl: string;
}

export default function HeroCinematic({
  badgeText, title, titleHighlight, subtitle, subtitle2, ctaText,
  proofBadges, orderCount, displayCount, orderCounterText, heroImageUrl,
}: HeroProps) {
  const inkColor = "hsl(var(--landing-ink))";
  const accentColor = "hsl(var(--landing-accent))";

  return (
    <section
      className="landing-cream relative overflow-hidden bg-[hsl(var(--landing-bg))]"
      style={{ color: inkColor }}
    >
      {/* Top nav */}
      <header className="relative z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 md:py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 transition-premium hover:opacity-90" aria-label="Ir para o início">
            <img src="/pwa-192.png" alt="TrendFood" className="w-8 h-8 rounded-lg object-contain" />
            <span className="font-display font-bold text-lg tracking-tight" style={{ color: inkColor }}>TrendFood</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 mr-auto ml-10">
            <a href="#funcionalidades" className="text-sm font-medium transition-premium hover:opacity-70" style={{ color: `hsl(var(--landing-ink) / 0.75)` }}>Recursos</a>
            <Link to="/planos" className="text-sm font-medium transition-premium hover:opacity-70" style={{ color: `hsl(var(--landing-ink) / 0.75)` }}>Preços</Link>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="h-10 px-4 rounded-full font-semibold hover:bg-[hsl(var(--landing-surface))]" style={{ color: inkColor }} asChild>
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button size="sm" className="h-10 px-5 rounded-full font-semibold text-white shadow-[0_8px_24px_-8px_hsl(var(--landing-accent)/0.6)] hover:brightness-110 transition-premium" style={{ background: accentColor }} asChild>
              <Link to="/auth">Começar Agora</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: content */}
          <div className="flex flex-col space-y-7 text-center lg:text-left">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center w-fit mx-auto lg:mx-0 px-4 py-1.5 rounded-full border font-semibold text-xs md:text-sm tracking-wide uppercase"
              style={{
                background: `hsl(var(--landing-surface))`,
                borderColor: `hsl(var(--landing-accent) / 0.2)`,
                color: accentColor,
              }}
            >
              <span className="flex h-2 w-2 rounded-full mr-2 animate-pulse" style={{ background: accentColor }} />
              {badgeText}
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tight"
              style={{ color: inkColor }}
            >
              {title}
              {titleHighlight && (
                <span className="block mt-2" style={{ color: accentColor }}>
                  {titleHighlight}
                </span>
              )}
            </motion.h1>

            {/* Subtitles */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-2"
            >
              <p className="text-base md:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0" style={{ color: `hsl(var(--landing-ink) / 0.7)` }}>
                {subtitle}
              </p>
              {subtitle2 && (
                <p className="text-sm md:text-base leading-relaxed max-w-xl mx-auto lg:mx-0" style={{ color: `hsl(var(--landing-ink) / 0.6)` }}>
                  {subtitle2}
                </p>
              )}
            </motion.div>

            {/* CTA row */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col space-y-4"
            >
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 justify-center lg:justify-start">
                <Link
                  to="/auth"
                  className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-xl font-bold text-base md:text-lg text-white shadow-[0_12px_32px_-8px_hsl(var(--landing-accent)/0.55)] hover:-translate-y-0.5 hover:brightness-110 transition-premium"
                  style={{ background: accentColor }}
                >
                  <span>{ctaText}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                {orderCount > 0 && (
                  <div className="inline-flex items-center gap-2 text-sm md:text-base font-semibold" style={{ color: `hsl(var(--landing-ink) / 0.85)` }}>
                    <Flame className="w-4 h-4 animate-pulse" style={{ color: accentColor }} />
                    +{displayCount.toLocaleString("pt-BR")} {orderCounterText}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center lg:justify-start text-xs md:text-sm font-medium" style={{ color: `hsl(var(--landing-ink) / 0.6)` }}>
                <span>✓ Grátis para começar</span>
                <span>✓ Sem cartão de crédito</span>
                <span>✓ Pronto em 2 minutos</span>
              </div>
            </motion.div>

            {/* Proof pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="flex flex-wrap gap-2 justify-center lg:justify-start pt-2"
            >
              {proofBadges.map((b) => (
                <span
                  key={b}
                  className="px-3 py-1.5 rounded-full text-sm font-medium bg-white border transition-premium hover:-translate-y-0.5"
                  style={{
                    borderColor: `hsl(var(--landing-surface))`,
                    color: `hsl(var(--landing-ink) / 0.8)`,
                  }}
                >
                  {b}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right: layered visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative flex items-center justify-center min-h-[420px] lg:min-h-[520px]"
          >
            {/* Decorative cream blob */}
            <div
              className="absolute w-[110%] h-[110%] rounded-full blur-3xl -z-10"
              style={{ background: `hsl(var(--landing-surface) / 0.6)` }}
            />

            <div className="relative w-full aspect-square max-w-[520px]">
              {/* Dashboard mockup */}
              <div
                className="absolute top-0 right-0 w-[92%] bg-white rounded-2xl overflow-hidden border border-black/5 transform rotate-2 z-10"
                style={{ boxShadow: "0 30px 60px -20px hsl(var(--landing-ink) / 0.18)" }}
              >
                <div className="bg-[hsl(var(--landing-surface))/0.4] px-4 py-2 border-b border-black/5 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: `hsl(var(--landing-accent) / 0.5)` }} />
                  <div className="w-2 h-2 rounded-full" style={{ background: `hsl(var(--landing-accent) / 0.25)` }} />
                  <div className="w-2 h-2 rounded-full" style={{ background: `hsl(var(--landing-accent) / 0.15)` }} />
                </div>
                <img
                  src={dashboardImg}
                  alt="Dashboard TrendFood"
                  loading="eager"
                  className="w-full block"
                />
              </div>

              {/* Floating "Faturamento" badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="absolute top-8 -left-2 md:-left-6 bg-white rounded-2xl px-4 py-3 z-20 border border-black/5"
                style={{ boxShadow: "0 20px 40px -12px hsl(var(--landing-ink) / 0.2)" }}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: `hsl(var(--landing-ink) / 0.5)` }}>Faturamento</div>
                <div className="text-lg font-bold tabular-nums font-display" style={{ color: inkColor }}>R$ 4.872</div>
                <div className="text-[10px] font-semibold tabular-nums" style={{ color: "hsl(142 71% 35%)" }}>↑ 23% hoje</div>
              </motion.div>

              {/* Phone mockup */}
              <motion.div
                initial={{ opacity: 0, y: 30, rotate: 0 }}
                animate={{ opacity: 1, y: 0, rotate: -6 }}
                transition={{ duration: 0.7, delay: 0.55 }}
                className="absolute -bottom-4 left-2 md:left-0 w-[38%] p-[3px] rounded-[2.2rem] z-30 border-2"
                style={{ background: inkColor, borderColor: inkColor, boxShadow: "0 30px 50px -15px hsl(var(--landing-ink) / 0.35)" }}
              >
                <div className="bg-white rounded-[2rem] overflow-hidden aspect-[9/19]">
                  <img
                    src={dashboardMobileImg}
                    alt="App TrendFood no celular"
                    loading="eager"
                    className="w-full h-full object-cover object-top block"
                  />
                </div>
              </motion.div>

              {/* QR / Pedido card */}
              <motion.div
                initial={{ opacity: 0, y: -12, rotate: 0 }}
                animate={{ opacity: 1, y: 0, rotate: 8 }}
                transition={{ duration: 0.7, delay: 0.7 }}
                className="absolute bottom-16 md:bottom-20 -right-2 md:-right-4 rounded-2xl px-4 py-3 z-20 text-white border border-white/20"
                style={{ background: accentColor, boxShadow: "0 20px 40px -12px hsl(var(--landing-accent) / 0.55)" }}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-85">Novo pedido</div>
                <div className="text-base font-bold tabular-nums font-display">Mesa 4 · R$ 87</div>
              </motion.div>

              {/* QR feature chip */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.85 }}
                className="absolute top-1/2 -translate-y-1/2 -left-4 md:-left-8 w-24 h-24 md:w-28 md:h-28 bg-white rounded-2xl border border-black/5 flex flex-col items-center justify-center gap-1"
                style={{ boxShadow: "0 20px 40px -12px hsl(var(--landing-ink) / 0.2)" }}
              >
                <QrCode className="w-10 h-10 md:w-12 md:h-12" style={{ color: inkColor }} />
                <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-tighter" style={{ color: `hsl(var(--landing-ink) / 0.5)` }}>Menu QR</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}