import { useState } from "react";
import { Link } from "react-router-dom";
import { RouteFallback } from "@/App";

export default function PreviewFallback() {
  const [stage, setStage] = useState<1 | 2>(1);
  return (
    <div className="relative">
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] flex gap-2 rounded-full border border-foreground/10 bg-background/80 backdrop-blur-xl p-1.5 shadow-lg">
        <button
          onClick={() => setStage(1)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${stage === 1 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Loading
        </button>
        <button
          onClick={() => setStage(2)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${stage === 2 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Sinal fraco
        </button>
        <Link
          to="/"
          className="px-3 py-1.5 text-xs font-semibold rounded-full text-muted-foreground hover:text-foreground transition"
        >
          ← Voltar
        </Link>
      </div>
      <RouteFallback key={stage} forceStage={stage} />
    </div>
  );
}