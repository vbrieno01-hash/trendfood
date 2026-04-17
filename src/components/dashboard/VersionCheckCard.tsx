import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { usePWAUpdate } from "@/hooks/usePWAUpdate";

export default function VersionCheckCard() {
  const { checkNow, handleUpdate } = usePWAUpdate();
  const [loading, setLoading] = useState(false);

  const version = (() => {
    try {
      return typeof __BUILD_VERSION__ !== "undefined" ? __BUILD_VERSION__ : "dev";
    } catch {
      return "dev";
    }
  })();

  const onCheck = async () => {
    setLoading(true);
    try {
      const found = await checkNow();
      if (found) {
        toast.success("Nova versão encontrada! Atualizando…");
        setTimeout(() => handleUpdate(), 800);
      } else {
        toast.success("Você está na versão mais recente ✓");
      }
    } catch {
      toast.error("Não foi possível verificar agora.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-glass rounded-2xl overflow-hidden animate-dashboard-fade-in dash-delay-2">
      <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Versão do sistema
        </p>
      </div>
      <div className="px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Versão atual: <span className="font-mono text-xs text-muted-foreground">v{version}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[360px]">
            Se algo parecer desatualizado, clique para verificar e baixar a versão mais recente.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onCheck}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Verificando…" : "Verificar atualizações"}
        </Button>
      </div>
    </div>
  );
}
