import { useOrgDeliveries, useOrgCouriers } from "@/hooks/useCourier";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bike, MapPin, Clock, CheckCircle2, Navigation, Users } from "lucide-react";

const statusMap: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  em_rota: { label: "Em rota", color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  entregue: { label: "Entregue", color: "bg-green-500/15 text-green-600 border-green-500/30" },
};

interface Props {
  orgId: string;
  orgSlug: string;
}

const CourierDashboardTab = ({ orgId, orgSlug }: Props) => {
  const { data: deliveries = [], isLoading } = useOrgDeliveries(orgId);
  const { data: couriers = [] } = useOrgCouriers(orgId);

  const courierMap = new Map(couriers.map((c) => [c.id, c]));

  const activeDeliveries = deliveries.filter((d) => d.status !== "entregue");
  const completedDeliveries = deliveries.filter((d) => d.status === "entregue");

  const courierLink = `${window.location.origin}/motoboy?org=${orgSlug}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Bike className="w-5 h-5 text-primary" />
          Motoboys & Entregas
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhe entregas em tempo real e gerencie seus motoboys.
        </p>
      </div>

      {/* Link para motoboys */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-1">Link para cadastro de motoboys:</p>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted px-3 py-2 rounded-lg flex-1 break-all">{courierLink}</code>
            <button
              onClick={() => { navigator.clipboard.writeText(courierLink); }}
              className="text-xs text-primary font-medium shrink-0 hover:underline"
            >
              Copiar
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
            <p className="text-2xl font-bold">{couriers.length}</p>
            <p className="text-xs text-muted-foreground">Motoboys</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{deliveries.filter((d) => d.status === "pendente").length}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Navigation className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{deliveries.filter((d) => d.status === "em_rota").length}</p>
            <p className="text-xs text-muted-foreground">Em rota</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{completedDeliveries.length}</p>
            <p className="text-xs text-muted-foreground">Entregues</p>
          </CardContent>
        </Card>
      </div>

      {/* Active deliveries */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Entregas ativas</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : activeDeliveries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma entrega ativa no momento.</p>
        ) : (
          <div className="space-y-2">
            {activeDeliveries.map((d) => {
              const s = statusMap[d.status] ?? statusMap.pendente;
              const courierName = d.courier_id ? courierMap.get(d.courier_id)?.name : null;
              return (
                <Card key={d.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-medium">#{d.order_id.slice(0, 8)}</span>
                        <Badge className={s.color}>{s.label}</Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{d.customer_address}</span>
                      </div>
                      {courierName && (
                        <p className="text-xs mt-1">
                          <Bike className="w-3 h-3 inline mr-1" />
                          {courierName}
                        </p>
                      )}
                    </div>
                    {d.fee != null && (
                      <span className="text-sm font-semibold text-primary shrink-0">
                        R$ {d.fee.toFixed(2)}
                      </span>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Couriers list */}
      {couriers.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3">Motoboys cadastrados</h3>
          <div className="space-y-2">
            {couriers.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                    <Bike className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone} · {c.plate}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CourierDashboardTab;
