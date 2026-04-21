import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform, useScroll } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Flame } from "lucide-react";
import dashboardImg from "@/assets/dashboard-screenshot.png";
import { useIsDesktop } from "@/hooks/useIsDesktop";

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

const Particle = ({ i }: { i: number }) => {
  const left = (i * 37) % 100;
  const top = (i * 53) % 100;
  const size = 2 + (i % 4);
  const delay = (i % 7) * 0.7;
  const duration = 6 + (i % 5);
  return (
    <span
      className="absolute rounded-full bg-orange-400/60 blur-[1px]"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: size,
        height: size,
        animation: `landing-float-particle ${duration}s ease-in-out ${delay}s infinite`,
      }}
    />
  );
};

export default function HeroCinematic({
  badgeText, title, titleHighlight, subtitle, subtitle2, ctaText,
  proofBadges, orderCount, displayCount, orderCounterText, heroImageUrl,
}: HeroProps) {
  const isDesktop = useIsDesktop();
  const mockupRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 150, damping: 20 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-12, 12]), { stiffness: 150, damping: 20 });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function handleLeave() {
    mx.set(0);
    my.set(0);
  }

  const { scrollY } = useScroll();
  const heroYRaw = useTransform(scrollY, [0, 600], [0, 120]);
  const heroOpacityRaw = useTransform(scrollY, [0, 500], [1, 0.4]);
  const heroY = isDesktop ? heroYRaw : 0;
  const heroOpacity = isDesktop ? heroOpacityRaw : 1;

  return (
    <section className="relative overflow-hidden min-h-[640px] md:min-h-screen">
      {/* Background image with parallax */}
      <motion.div className="absolute inset-0 z-0" style={{ y: heroY }}>
        <img src={heroImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to right, rgba(10,8,6,0.95) 0%, rgba(15,10,5,0.85) 45%, rgba(10,8,6,0.6) 100%)" }}
        />
      </motion.div>

      {/* Particles layer */}
      {isDesktop && (
        <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
          {Array.from({ length: 28 }).map((_, i) => (
            <Particle key={i} i={i} />
          ))}
        </div>
      )}

      {/* Radial orange glow center-bottom */}
      <div
        className="absolute z-[1] left-1/2 -translate-x-1/2 bottom-0 w-[900px] h-[600px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(249,115,22,0.18) 0%, transparent 70%)",
        }}
      />

      <header className="relative z-10 border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between backdrop-blur-md bg-white/[0.03] rounded-b-2xl">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity" aria-label="Ir para o início">
            <img src="/pwa-192.png" alt="TrendFood" className="w-8 h-8 rounded-lg object-contain" />
            <span className="font-bold text-white text-lg tracking-tight">TrendFood</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 mr-auto ml-10">
            <a href="#funcionalidades" className="text-white/60 hover:text-white text-sm font-medium transition-colors">Recursos</a>
            <Link to="/planos" className="text-white/60 hover:text-white text-sm font-medium transition-colors">Preços</Link>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/[0.06] transition-all" asChild>
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5 transition-all" asChild>
              <Link to="/auth">Começar Agora</Link>
            </Button>
          </div>
        </div>
      </header>

      <motion.div className="relative z-10 flex items-center" style={{ opacity: heroOpacity }}>
        <div className="max-w-6xl mx-auto px-4 pt-12 pb-16 md:pt-20 md:pb-32 w-full grid md:grid-cols-[1.1fr_1fr] gap-8 md:gap-12 items-center">
          {/* Left: text */}
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge className="mb-8 bg-white/[0.08] text-white/80 border-white/[0.1] hover:bg-white/[0.12] backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium">
                <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                {badgeText}
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-[1.05] tracking-tight"
            >
              {title}
              <br />
              <span className="landing-gradient-text">{titleHighlight}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="text-base md:text-lg text-white/75 max-w-xl mx-auto lg:mx-0 mb-3 leading-[1.7]"
            >
              {subtitle}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-sm md:text-base text-white/45 max-w-lg mx-auto lg:mx-0 mb-10 leading-relaxed"
            >
              {subtitle2}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex justify-center lg:justify-start"
            >
              <Link
                to="/auth"
                className="relative overflow-hidden inline-flex items-center gap-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-lg font-bold px-10 py-4 rounded-full shadow-[0_8px_32px_rgba(249,115,22,0.5)] hover:shadow-[0_12px_40px_rgba(249,115,22,0.65)] hover:scale-[1.03] transition-all duration-300"
              >
                <span className="relative z-10">{ctaText}</span>
                <ArrowRight className="w-5 h-5 relative z-10" />
                <div className="landing-shimmer-overlay" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="mt-10 flex flex-wrap gap-2.5 justify-center lg:justify-start"
            >
              {proofBadges.map((b) => (
                <span key={b} className="px-4 py-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 text-white/80 text-sm font-medium">{b}</span>
              ))}
            </motion.div>

            {orderCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.9 }}
                className="mt-6 flex justify-center lg:justify-start"
              >
                <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-orange-500/15 border border-orange-400/30 text-orange-300 text-sm font-semibold tracking-wide">
                  <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
                  +{displayCount.toLocaleString("pt-BR")} {orderCounterText}
                </span>
              </motion.div>
            )}
          </div>

          {/* Right: 3D mockup (md+) — tilt only on lg+ */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.3 }}
            className="hidden md:block perspective-[1400px]"
            style={{ perspective: 1400 }}
          >
            <motion.div
              ref={mockupRef}
              onMouseMove={(e) => { if (window.innerWidth >= 1024) handleMove(e); }}
              onMouseLeave={() => { if (window.innerWidth >= 1024) handleLeave(); }}
              style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
              className="relative w-full max-w-[420px] lg:max-w-[560px] mx-auto"
            >
              {/* Glow behind */}
              <div
                className="absolute -inset-10 rounded-[2rem] opacity-60 blur-3xl"
                style={{ background: "radial-gradient(ellipse at center, rgba(249,115,22,0.45), transparent 70%)" }}
              />
              <div
                className="relative rounded-2xl overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)] border border-white/10"
                style={{ background: "#1a1a2e", transform: "translateZ(40px)" }}
              >
                <div className="flex items-center gap-1.5 px-3 py-2" style={{ background: "#2a2a3e" }}>
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <div className="flex-1 mx-3">
                    <div className="h-3.5 rounded bg-white/10 w-40 mx-auto" />
                  </div>
                </div>
                <img src={dashboardImg} alt="Dashboard TrendFood" className="w-full block" />
              </div>
              {/* Floating badge */}
              <div
                className="absolute -left-6 top-1/3 bg-white rounded-xl shadow-2xl px-4 py-3 border border-orange-200"
                style={{ transform: "translateZ(80px)" }}
              >
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Faturamento</div>
                <div className="text-lg font-bold text-foreground">R$ 4.872</div>
                <div className="text-[10px] text-emerald-600 font-semibold">↑ 23% hoje</div>
              </div>
              <div
                className="absolute -right-4 bottom-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-2xl px-4 py-3 text-white"
                style={{ transform: "translateZ(80px)" }}
              >
                <div className="text-[10px] font-medium uppercase tracking-wider opacity-80">Novo pedido</div>
                <div className="text-base font-bold">Mesa 4 · R$ 87</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}