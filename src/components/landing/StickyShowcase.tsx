import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Wallet, TrendingUp, UtensilsCrossed, Flame, type LucideIcon } from "lucide-react";
import dashboardDesktopAsset from "@/assets/dashboard-desktop.png.asset.json";
const dashboardImg = dashboardDesktopAsset.url;

interface ShowcaseTab {
  icon: LucideIcon;
  label: string;
  desc: string;
}

const tabs: ShowcaseTab[] = [
  { icon: TrendingUp, label: "Pedidos ao vivo", desc: "Receba pedidos em tempo real, com alerta sonoro e impressão automática para a cozinha." },
  { icon: Wallet, label: "Caixa em 1 clique", desc: "Abertura, fechamento e sangria do caixa com relatório completo do turno." },
  { icon: BarChart3, label: "Mais vendidos", desc: "Ranking de produtos por período com receita gerada por cada item — saiba o que vende." },
  { icon: UtensilsCrossed, label: "Cardápio digital", desc: "Categorias, fotos e preços organizados. Cliente pede pelo celular sem app." },
  { icon: Flame, label: "Painel KDS", desc: "Tela dedicada para a cozinha com fila de pedidos e tempo de preparo." },
];

export default function StickyShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isMobile) {
    return (
      <section className="relative bg-ink py-16 px-4 overflow-hidden">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 30%, hsl(var(--landing-accent) / 0.25), transparent)",
          }}
        />
        <div className="relative max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <div className="hairline-accent mx-auto mb-5" />
            <h2 className="font-display font-bold text-4xl md:text-5xl tracking-tight" style={{ color: "hsl(var(--landing-bg))" }}>
              Um sistema. <span style={{ color: "hsl(var(--landing-accent))" }}>Operação inteira.</span>
            </h2>
          </div>

          {/* Mockup once on top */}
          <div className="relative mb-10">
            <div
              className="absolute -inset-6 rounded-[2rem] opacity-50 blur-3xl pointer-events-none"
              style={{ background: "radial-gradient(ellipse, rgba(249,115,22,0.35), transparent 70%)" }}
            />
            <div
              className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 mx-auto max-w-[460px]"
              style={{ background: "#1a1a2e" }}
            >
              <div className="flex items-center gap-1.5 px-3 py-2" style={{ background: "#2a2a3e" }}>
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              </div>
              <img src={dashboardImg} alt="Dashboard TrendFood" className="w-full block" />
            </div>
          </div>

          {/* Vertical list of features */}
          <div className="space-y-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <div
                  key={tab.label}
                  className="flex items-start gap-4 p-4 rounded-2xl border border-white/10"
                  style={{ background: "hsl(var(--landing-bg) / 0.04)" }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white" style={{ background: "hsl(var(--landing-accent))" }}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg mb-1" style={{ color: "hsl(var(--landing-bg))" }}>{tab.label}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--landing-bg) / 0.65)" }}>{tab.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="relative bg-ink overflow-hidden py-20 lg:py-24">
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 70% 50%, hsl(var(--landing-accent) / 0.3), transparent)",
        }}
      />
      <div className="relative max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-12 items-center">
        {/* Left: tabs list */}
        <div className="space-y-2">
          <div className="hairline-accent mb-5" />
          <h2 className="font-display font-bold text-4xl md:text-6xl mb-8 tracking-tight leading-[0.95]" style={{ color: "hsl(var(--landing-bg))" }}>
            Um sistema.<br /><span style={{ color: "hsl(var(--landing-accent))" }}>Operação inteira.</span>
          </h2>
          {tabs.map((tab, i) => {
            const Icon = tab.icon;
            return (
              <TabRow
                key={tab.label}
                tab={tab}
                index={i}
                activeIndex={activeIndex}
                Icon={Icon}
                onActivate={() => setActiveIndex(i)}
              />
            );
          })}
        </div>

        {/* Right: dashboard mockup */}
        <div className="relative perspective-[1400px]" style={{ perspective: 1400 }}>
          <motion.div
            style={{ rotateY: -8, rotateX: 4, transformStyle: "preserve-3d" }}
            className="relative w-full max-w-[600px] mx-auto"
          >
            <div
              className="absolute -inset-12 rounded-[2rem] opacity-60 blur-3xl"
              style={{ background: "radial-gradient(ellipse, rgba(249,115,22,0.4), transparent 70%)" }}
            />
            <div
              className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10"
              style={{ background: "#1a1a2e" }}
            >
              <div className="flex items-center gap-1.5 px-3 py-2" style={{ background: "#2a2a3e" }}>
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              </div>
              <div className="relative">
                <img src={dashboardImg} alt="Dashboard TrendFood" className="w-full block" />
                {tabs.map((tab, i) => (
                  <ScreenLabel key={tab.label} index={i} activeIndex={activeIndex} label={tab.label} />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

interface TabRowProps {
  tab: ShowcaseTab;
  index: number;
  activeIndex: number;
  Icon: LucideIcon;
  onActivate: () => void;
}

function TabRow({ tab, index, activeIndex, Icon, onActivate }: TabRowProps) {
  const isActive = activeIndex === index;

  return (
    <motion.button
      type="button"
      onMouseEnter={onActivate}
      onFocus={onActivate}
      animate={{ opacity: isActive ? 1 : 0.42, x: isActive ? 8 : 0 }}
      transition={{ duration: 0.2 }}
      className="flex w-full items-start gap-4 rounded-2xl p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
      aria-pressed={isActive}
    >
      <motion.div
        animate={{ scale: 1 }}
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white"
        style={{ background: "hsl(var(--landing-accent))" }}
      >
        <Icon className="w-6 h-6" />
      </motion.div>
      <div>
        <h3 className="font-display font-bold text-lg mb-1" style={{ color: "hsl(var(--landing-bg))" }}>{tab.label}</h3>
        <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--landing-bg) / 0.7)" }}>{tab.desc}</p>
      </div>
    </motion.button>
  );
}

interface ScreenLabelProps {
  index: number;
  activeIndex: number;
  label: string;
}

function ScreenLabel({ index, activeIndex, label }: ScreenLabelProps) {
  const isActive = activeIndex === index;

  return (
    <motion.div
      animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 10 }}
      transition={{ duration: 0.2 }}
      className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-primary/90 backdrop-blur-md text-primary-foreground text-xs font-bold shadow-xl"
    >
      {label}
    </motion.div>
  );
}