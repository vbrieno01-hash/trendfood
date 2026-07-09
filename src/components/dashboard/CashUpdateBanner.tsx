import { useState } from "react";
import { Sparkles, X, Wallet, ArrowRight, BarChart3, Printer, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "cashUpdateBannerDismissedV1";

interface Props {
  onOpen?: () => void;
  className?: string;
}

/**
 * Banner de anúncio da atualização do Controle de Caixa (v3).
 * Dismissível de forma permanente (chave versionada, se rolar uma v2 no futuro
 * basta trocar DISMISS_KEY).
 */
export default function CashUpdateBanner({ onOpen, className }: Props) {
  const [dismissed, setDismissed] = useState<boolean>(
    () => localStorage.getItem(DISMISS_KEY) === "1"
  );

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-background p-5 md:p-6",
        className
      )}
    >
      {/* glow decorativo */}
      <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-primary/10 blur-3xl" />

      <button
        onClick={handleDismiss}
        aria-label="Fechar aviso"
        className="absolute top-3 right-3 text-muted-foreground/70 hover:text-foreground transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="relative flex flex-col md:flex-row md:items-center gap-5">
        <div className="shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white shadow-lg shadow-primary/30">
            <Wallet className="w-7 h-7" />
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 text-primary px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            Novidade
          </div>
          <h3 className="text-lg md:text-xl font-bold text-foreground leading-tight">
            Controle de Caixa profissional chegou.
          </h3>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Feche cada turno com <strong className="text-foreground">cupom Z impresso</strong>, exporte planilha do dia,
            veja <strong className="text-foreground">ranking de operadores</strong> e gráficos de divergência.
            Zero adivinhação — cada centavo do seu caixa agora tem rastro.
          </p>

          <div className="flex flex-wrap gap-3 pt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Printer className="w-3.5 h-3.5 text-primary" />
              Cupom Z automático
            </span>
            <span className="inline-flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5 text-primary" />
              Comparativo por turno
            </span>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              Auditoria à prova de fraude
            </span>
          </div>
        </div>

        {onOpen && (
          <div className="shrink-0">
            <Button onClick={onOpen} className="group">
              Abrir Caixa
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}