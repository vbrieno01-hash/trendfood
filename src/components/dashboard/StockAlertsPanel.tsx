import { AlertTriangle, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStockAlerts, useAcknowledgeStockAlert, useAcknowledgeAllStockAlerts } from "@/hooks/useStockAlerts";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  orgId: string;
}

export default function StockAlertsPanel({ orgId }: Props) {
  const { data: alerts = [] } = useStockAlerts(orgId, true);
  const ackOne = useAcknowledgeStockAlert(orgId);
  const ackAll = useAcknowledgeAllStockAlerts(orgId);

  if (alerts.length === 0) return null;

  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 space-y-3 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive animate-pulse" />
          <div>
            <h3 className="font-semibold text-destructive">
              {alerts.length} {alerts.length === 1 ? "alerta de estoque" : "alertas de estoque"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Pedidos consumiram mais do que havia disponível. Reponha o estoque e marque como resolvido.
            </p>
          </div>
        </div>
        {alerts.length > 1 && (
          <Button size="sm" variant="outline" onClick={() => ackAll.mutate()} disabled={ackAll.isPending}>
            <CheckCheck className="w-4 h-4 mr-1" /> Resolver todos
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {alerts.map((a) => (
          <div
            key={a.id}
            className="flex items-start justify-between gap-3 p-3 rounded-lg bg-background/60 border border-destructive/20"
          >
            <div className="text-sm space-y-1">
              <div className="font-medium">
                Faltaram <span className="text-destructive font-bold">{Number(a.shortage).toLocaleString("pt-BR")}</span> de{" "}
                <span className="font-bold">{a.stock_item_name}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {a.menu_item_name && <>Produto: <strong>{a.menu_item_name}</strong> · </>}
                Pedido: {Number(a.requested_qty).toLocaleString("pt-BR")} · Disponível: {Number(a.available_qty).toLocaleString("pt-BR")}
                {a.order_number ? ` · #${a.order_number}` : ""}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR })}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => ackOne.mutate(a.id)}
              disabled={ackOne.isPending}
            >
              <Check className="w-4 h-4 mr-1" /> Resolvido
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}