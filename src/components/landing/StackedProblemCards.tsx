import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface Problem { image: string; title: string; description: string; }
interface Props {
  title: string;
  subtitle: string;
  problems: Problem[];
}

function StackedCard({ problem, index, total, progress }: { problem: Problem; index: number; total: number; progress: any }) {
  const start = index / total;
  const end = (index + 1) / total;
  const y = useTransform(progress, [start, end], [60 * (total - index), 0]);
  const scale = useTransform(progress, [start, end], [0.9 + index * 0.02, 1]);
  const opacity = useTransform(progress, [start, Math.min(start + 0.15, 1)], [0, 1]);
  const rotate = useTransform(progress, [start, end], [(index - 1) * 2, 0]);

  return (
    <motion.div
      style={{ y, scale, opacity, rotate, zIndex: index }}
      className="bg-card rounded-3xl overflow-hidden border border-border shadow-2xl"
    >
      <div className="h-48 overflow-hidden relative">
        <img src={problem.image} alt={problem.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
      </div>
      <div className="p-7">
        <h3 className="font-bold text-foreground text-xl mb-3">{problem.title}</h3>
        <p className="text-muted-foreground leading-relaxed">{problem.description}</p>
      </div>
    </motion.div>
  );
}

export default function StackedProblemCards({ title, subtitle, problems }: Props) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });

  return (
    <section id="problemas" ref={sectionRef} className="py-24 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">O problema real</Badge>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-3 tracking-tight">{title}</h2>
          <p className="text-muted-foreground text-lg">{subtitle}</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 perspective-[1200px]" style={{ perspective: 1200 }}>
          {problems.map((p, i) => (
            <StackedCard key={p.title || i} problem={p} index={i} total={problems.length} progress={scrollYProgress} />
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-12 text-lg font-semibold text-foreground"
        >
          A TrendFood resolve tudo isso. <span className="text-primary">Veja como 👇</span>
        </motion.p>
      </div>
    </section>
  );
}