import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface Props {
  count: number;
  label: string;
}

function FlipDigit({ digit }: { digit: string }) {
  return (
    <div className="relative inline-block overflow-hidden align-baseline" style={{ height: "1em", width: "0.6em" }}>
      <motion.div
        key={digit}
        initial={{ y: "-100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
        className="absolute inset-0 flex items-center justify-center"
      >
        {digit}
      </motion.div>
    </div>
  );
}

export default function LiveOrderCounter({ count, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20%" });
  const formatted = count.toLocaleString("pt-BR");
  const chars = formatted.split("");

  return (
    <section ref={ref} className="relative py-24 px-4 overflow-hidden bg-gradient-to-b from-background via-orange-50/30 to-background dark:via-orange-950/10">
      <div
        className="absolute inset-0 opacity-50 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(249,115,22,0.18), transparent)",
        }}
      />
      <div className="relative max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-6"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-widest">Ao vivo</span>
        </motion.div>

        <div className="flex justify-center items-baseline font-extrabold tracking-tight tabular-nums leading-none">
          <span
            className="text-[clamp(4rem,14vw,9rem)] landing-gradient-text"
            style={{ filter: "drop-shadow(0 8px 32px rgba(249,115,22,0.4))" }}
          >
            {chars.map((c, i) =>
              /\d/.test(c) ? <FlipDigit key={`${i}-${c}`} digit={c} /> : <span key={`${i}-${c}`}>{c}</span>
            )}
          </span>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-6 text-lg md:text-xl text-muted-foreground font-medium"
        >
          {label}
        </motion.p>
      </div>
    </section>
  );
}