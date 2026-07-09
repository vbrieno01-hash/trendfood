import { Link } from "react-router-dom";
import { Flame, ArrowRight, Gift } from "lucide-react";

export default function HeroOfferBanner() {
  return (
    <div
      className="relative overflow-hidden"
      style={{ background: "hsl(var(--landing-accent))" }}
    >
      <div className="relative max-w-6xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center sm:text-left">
        <div className="flex items-center gap-2" style={{ color: "hsl(var(--landing-ink))" }}>
          <span className="relative flex h-6 w-6 items-center justify-center shrink-0">
            <span className="absolute inline-flex h-full w-full rounded-full bg-white/50 animate-ping" />
            <Flame className="relative w-4 h-4" />
          </span>
          <span className="font-display text-sm sm:text-base font-bold leading-tight">
            7 dias Pro grátis
            <span className="hidden sm:inline font-medium opacity-80"> + </span>
            <span className="block sm:inline font-medium opacity-80">
              <Gift className="inline w-4 h-4 mb-0.5 mr-1" />
              30 dias bônus indicando 1 amigo
            </span>
          </span>
        </div>

        <Link
          to="/auth"
          className="group inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white font-display font-bold text-sm shadow-[0_6px_16px_-4px_rgba(0,0,0,0.25)] hover:-translate-y-0.5 transition-transform whitespace-nowrap"
          style={{ color: "hsl(var(--landing-ink))" }}
        >
          Começar agora
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <span className="hidden md:inline text-xs font-medium opacity-75" style={{ color: "hsl(var(--landing-ink))" }}>
          Sem cartão • Cancela quando quiser
        </span>
      </div>
    </div>
  );
}
