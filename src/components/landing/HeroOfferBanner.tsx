import { Link } from "react-router-dom";
import { Flame, ArrowRight, Gift } from "lucide-react";

export default function HeroOfferBanner() {
  return (
    <div className="relative overflow-hidden border-b border-primary/20">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--primary)) 0%, #ff8a3d 50%, hsl(var(--primary)) 100%)",
        }}
      />
      <div className="absolute inset-0 opacity-30 mix-blend-overlay"
           style={{ background: "radial-gradient(ellipse 60% 100% at 50% 0%, white, transparent)" }} />

      <div className="relative max-w-6xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center sm:text-left">
        <div className="flex items-center gap-2 text-primary-foreground">
          <span className="relative flex h-6 w-6 items-center justify-center shrink-0">
            <span className="absolute inline-flex h-full w-full rounded-full bg-white/40 animate-ping" />
            <Flame className="relative w-4 h-4 text-white" />
          </span>
          <span className="text-sm sm:text-base font-bold text-white leading-tight">
            7 dias Pro grátis
            <span className="hidden sm:inline text-white/90 font-medium"> + </span>
            <span className="block sm:inline text-white/90 font-medium">
              <Gift className="inline w-4 h-4 mb-0.5 mr-1" />
              30 dias bônus indicando 1 amigo
            </span>
          </span>
        </div>

        <Link
          to="/auth"
          className="group inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-primary font-bold text-sm shadow-lg hover:shadow-xl hover:scale-[1.03] transition-all whitespace-nowrap"
        >
          Começar agora
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <span className="hidden md:inline text-xs text-white/80 font-medium">
          Sem cartão • Cancela quando quiser
        </span>
      </div>
    </div>
  );
}
