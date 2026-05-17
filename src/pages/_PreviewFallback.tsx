import { Link } from "react-router-dom";
import { RouteFallback } from "@/App";

export default function PreviewFallback() {
  return (
    <div className="relative">
      <Link
        to="/"
        className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 text-xs font-semibold rounded-full border border-foreground/10 bg-background/80 backdrop-blur-xl text-muted-foreground hover:text-foreground transition shadow-lg"
      >
        ← Voltar
      </Link>
      <RouteFallback forceShow />
    </div>
  );
}