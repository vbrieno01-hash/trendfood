import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { UtensilsCrossed, QrCode, Flame, BarChart3 } from "lucide-react";
import { useIsDesktop } from "@/hooks/useIsDesktop";

const stepIcons = [UtensilsCrossed, QrCode, Flame, BarChart3];

interface Step { title: string; description: string; }
interface Props { steps: Step[]; }

function StepCard({ step, index, progress }: { step: Step; index: number; progress: any }) {
  const total = 4;
  const start = index / total;
  const end = (index + 0.7) / total;
  const opacity = useTransform(progress, [start, end], [0.25, 1]);
  const x = useTransform(progress, [start, end], [index % 2 === 0 ? -40 : 40, 0]);
  const Icon = stepIcons[index] || UtensilsCrossed;
  const isLeft = index % 2 === 0;

  return (
    <motion.div
      style={{ opacity, x }}
      className={`relative grid grid-cols-[3rem_1fr] md:grid-cols-2 gap-4 md:gap-8 items-center mb-8 md:mb-16 last:mb-0 ${isLeft ? "" : "md:[direction:rtl]"}`}
    >
      {/* Mobile icon (left rail) */}
      <div className="md:hidden flex justify-center">
        <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-primary-foreground shadow-[0_10px_25px_-8px_rgba(249,115,22,0.55)]">
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className={`md:[direction:ltr] order-2 md:order-none ${isLeft ? "md:text-right md:pr-12" : "md:pl-12"}`}>
        <div className={`inline-flex items-center gap-3 mb-2 md:mb-3 ${isLeft ? "md:flex-row-reverse" : ""}`}>
          <span className="text-5xl font-black text-primary/20">{String(index + 1).padStart(2, "0")}</span>
          <span className="h-px w-10 bg-primary/30" />
        </div>
        <h3 className="font-bold text-foreground text-xl mb-2">{step.title}</h3>
        <p className="text-muted-foreground leading-relaxed">{step.description}</p>
      </div>
      <div className="hidden md:flex md:[direction:ltr] justify-center">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="relative w-32 h-32 rounded-3xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-primary-foreground shadow-[0_20px_50px_-10px_rgba(249,115,22,0.5)]"
        >
          <Icon className="w-12 h-12" />
          <div className="absolute inset-0 rounded-3xl border-2 border-primary/40" style={{ animation: "landing-glow-pulse 2.5s ease-in-out infinite" }} />
        </motion.div>
      </div>
      {/* Center dot on the line */}
      <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary ring-4 ring-background shadow-lg" />
    </motion.div>
  );
}

export default function TimelineSteps({ steps }: Props) {
  const isDesktop = useIsDesktop();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 30%"] });
  const lineLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id="como-funciona" className="bg-cream-surface py-16 md:py-28 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 md:mb-16">
          <div className="hairline-accent mx-auto mb-5" />
          <h2 className="font-display font-bold text-4xl md:text-5xl text-ink mb-3 tracking-tight">Quatro passos simples</h2>
          <p className="text-ink-muted text-lg">Do cardápio ao fechamento do caixa, tudo integrado</p>
        </div>

        <div ref={ref} className="relative">
          {/* Vertical animated line — left on mobile, center on desktop */}
          <div className="absolute left-6 md:left-1/2 top-0 md:-translate-x-1/2 w-0.5 h-full bg-border" />
          {isDesktop ? (
            <motion.div
              style={{ scaleY: lineLength, transformOrigin: "top" }}
              className="absolute left-6 md:left-1/2 top-0 md:-translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-primary via-orange-500 to-primary/0"
            />
          ) : (
            <div className="absolute left-6 md:left-1/2 top-0 md:-translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-primary/60 via-orange-500/40 to-primary/0" />
          )}

          {steps.map((step, i) =>
            isDesktop ? (
              <StepCard key={step.title || i} step={step} index={i} progress={scrollYProgress} />
            ) : (
              <SimpleStepCard key={step.title || i} step={step} index={i} />
            )
          )}
        </div>
      </div>
    </section>
  );
}

function SimpleStepCard({ step, index }: { step: Step; index: number }) {
  const Icon = stepIcons[index] || UtensilsCrossed;
  const isLeft = index % 2 === 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className={`relative grid grid-cols-[3rem_1fr] md:grid-cols-2 gap-4 md:gap-8 items-center mb-8 md:mb-16 last:mb-0 ${isLeft ? "" : "md:[direction:rtl]"}`}
    >
      <div className="md:hidden flex justify-center">
        <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-primary-foreground shadow-[0_10px_25px_-8px_rgba(249,115,22,0.55)]">
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className={`md:[direction:ltr] order-2 md:order-none ${isLeft ? "md:text-right md:pr-12" : "md:pl-12"}`}>
        <div className={`inline-flex items-center gap-3 mb-2 md:mb-3 ${isLeft ? "md:flex-row-reverse" : ""}`}>
          <span className="text-5xl font-black text-primary/20">{String(index + 1).padStart(2, "0")}</span>
          <span className="h-px w-10 bg-primary/30" />
        </div>
        <h3 className="font-bold text-foreground text-xl mb-2">{step.title}</h3>
        <p className="text-muted-foreground leading-relaxed">{step.description}</p>
      </div>
      <div className="hidden md:flex md:[direction:ltr] justify-center">
        <div className="relative w-32 h-32 rounded-3xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-primary-foreground shadow-[0_20px_50px_-10px_rgba(249,115,22,0.5)]">
          <Icon className="w-12 h-12" />
        </div>
      </div>
    </motion.div>
  );
}