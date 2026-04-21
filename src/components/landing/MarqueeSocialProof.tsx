import { Sparkles, ShieldCheck, Zap, Smartphone, Pizza, Coffee, ShoppingBag, IceCream, Beef, Cookie } from "lucide-react";

const items = [
  { icon: Sparkles, label: "Zero comissão" },
  { icon: Pizza, label: "Pizzaria" },
  { icon: ShieldCheck, label: "Suporte 24/7" },
  { icon: Coffee, label: "Cafeteria" },
  { icon: Zap, label: "PIX automático" },
  { icon: ShoppingBag, label: "Mercearia" },
  { icon: Smartphone, label: "Sem app" },
  { icon: IceCream, label: "Açaiteria" },
  { icon: Beef, label: "Hamburgueria" },
  { icon: Cookie, label: "Doceria" },
];

export default function MarqueeSocialProof() {
  const doubled = [...items, ...items];
  return (
    <section className="relative py-8 bg-background border-y border-border/60 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-32 z-10"
        style={{ background: "linear-gradient(to right, hsl(var(--background)), transparent)" }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-32 z-10"
        style={{ background: "linear-gradient(to left, hsl(var(--background)), transparent)" }}
      />
      <div className="flex landing-marquee-track gap-12 whitespace-nowrap will-change-transform">
        {doubled.map((it, i) => {
          const Icon = it.icon;
          return (
            <div key={i} className="flex items-center gap-2.5 text-muted-foreground shrink-0">
              <Icon className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold tracking-wide">{it.label}</span>
              <span className="text-border ml-12">•</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}