import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { usePWAUpdate } from "@/hooks/usePWAUpdate";

export default function VersionCheckCard() {
  const { handleUpdate } = usePWAUpdate();
  const [loading, setLoading] = useState(false);

  const version = (() => {
    try {
      return typeof __BUILD_VERSION__ !== "undefined" ? __BUILD_VERSION__ : "dev";
    } catch {
      return "dev";
    }
  })();

  const onCheck = () => {
    setLoading(true);
    toast.success("Aplicando a última atualização…");
    // Pequeno delay só pra UX (mostrar o toast antes do reload)
    setTimeout(() => handleUpdate(), 600);
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
            <CheckCircle2 className="w-4 h-4 text-success" />
            Versão atual: <span className="font-mono text-xs text-muted-foreground">v{version}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[360px]">
            Mantenha o sistema sempre atualizado. Clique para baixar a última versão disponível agora mesmo.
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
          {loading ? "Atualizando…" : "Atualizar agora"}
        </Button>
      </div>
    </div>
  );
}
