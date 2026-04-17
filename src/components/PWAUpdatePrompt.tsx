import { Sparkles, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAUpdate } from "@/hooks/usePWAUpdate";

const PWAUpdatePrompt = () => {
  const { showPrompt, handleUpdate, handleSnooze } = usePWAUpdate();

  if (!showPrompt) return null;

  return (
    <div
      className="fixed z-[100] bottom-4 right-4 left-4 sm:left-auto sm:max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300"
      role="alert"
      aria-live="polite"
    >
      <div className="relative rounded-2xl border border-primary/20 bg-card/95 backdrop-blur-xl shadow-2xl p-5 overflow-hidden">
        {/* Glow decorativo */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={handleSnooze}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Adiar por 1 hora"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 pr-4">
            <h4 className="font-semibold text-foreground leading-tight">
              Nova versão disponível!
            </h4>
            <p className="text-xs text-muted-foreground mt-1 leading-snug">
              Clique para atualizar e ver as novidades. Seus dados em andamento serão preservados.
            </p>
          </div>
        </div>

        <div className="relative flex gap-2 mt-4">
          <Button
            onClick={handleUpdate}
            size="sm"
            className="flex-1 gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar agora
          </Button>
          <Button
            onClick={handleSnooze}
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
          >
            Mais tarde
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PWAUpdatePrompt;
