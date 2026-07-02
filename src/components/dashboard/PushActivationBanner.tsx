import { useEffect, useState } from "react";
import { Bell, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { toast } from "sonner";

const DISMISS_KEY = "pushBannerDismissedAt";
const DISMISS_DAYS = 7;

interface Props {
  orgId: string;
}

export default function PushActivationBanner({ orgId }: Props) {
  const { isSupported, isSubscribed, isLoading, subscribe } = usePushSubscription(orgId);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const [dismissed, setDismissed] = useState<boolean>(() => {
    const at = localStorage.getItem(DISMISS_KEY);
    if (!at) return false;
    const diffMs = Date.now() - Number(at);
    return diffMs < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  });

  useEffect(() => {
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
  }, [isSubscribed]);

  if (!isSupported || permission === "unsupported") return null;
  if (isSubscribed) return null;
  if (permission === "granted" && isSubscribed) return null;
  if (dismissed && permission !== "denied") return null;

  const isBlocked = permission === "denied";

  const handleActivate = async () => {
    const ok = await subscribe();
    if (ok) {
      toast.success("Notificações ativadas! 🔔");
      setPermission("granted");
    } else {
      const p = typeof Notification !== "undefined" ? Notification.permission : "default";
      setPermission(p);
      if (p === "denied") {
        toast.error("Notificações bloqueadas", {
          description: "Libere nas configurações do navegador (🔒 na barra de endereço).",
        });
      } else {
        toast("Permissão não concedida");
      }
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  if (isBlocked) {
    return (
      <div className="relative flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 animate-dashboard-fade-in">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Notificações bloqueadas</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Clique no cadeado 🔒 ao lado da URL → Notificações → Permitir. Depois recarregue a página.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Fechar"
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-background/50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 animate-dashboard-fade-in">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Bell className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          Ative as notificações de pedido
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Receba alertas de novos pedidos, cancelamentos e estoque baixo mesmo com o navegador fechado.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" variant="ghost" onClick={handleDismiss}>
          Depois
        </Button>
        <Button size="sm" onClick={handleActivate} disabled={isLoading}>
          {isLoading ? "Ativando…" : "Ativar"}
        </Button>
      </div>
    </div>
  );
}