import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useIsDesktop } from "@/hooks/useIsDesktop";

interface Props {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}

export default function MagneticFeatureCard({ title, description, icon, index }: Props) {
  const isDesktop = useIsDesktop();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [4, -4]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-6, 6]), { stiffness: 200, damping: 20 });
  const glowX = useTransform(mx, (v) => `${(v + 0.5) * 100}%`);
  const glowY = useTransform(my, (v) => `${(v + 0.5) * 100}%`);
  const glowBg = useTransform([glowX, glowY], ([x, y]) =>
    `radial-gradient(400px circle at ${x} ${y}, hsl(var(--primary) / 0.18), transparent 40%)`
  );

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!isDesktop) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }
  function handleLeave() {
    if (!isDesktop) return;
    mx.set(0);
    my.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={isDesktop ? handleMove : undefined}
      onMouseLeave={isDesktop ? handleLeave : undefined}
      style={isDesktop ? { rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" } : undefined}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="group relative paper-card p-6 hover:-translate-y-0.5 transition-transform overflow-hidden"
    >
      {isDesktop && <div className="landing-conic-border" />}
      {isDesktop && (
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: glowBg as any }}
        />
      )}
      <div className="relative" style={isDesktop ? { transform: "translateZ(20px)" } : undefined}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-colors bg-accent-solid">
          {icon}
        </div>
        <h3 className="font-display font-bold text-ink mb-1">{title}</h3>
        <p className="text-ink-muted text-sm leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}