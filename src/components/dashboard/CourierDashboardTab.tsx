import { useState, useEffect, useMemo } from "react";
import {
  useOrgDeliveries,
  useOrgCouriers,
  useDeleteDelivery,
  useClearDeliveryHistory,
  useCompleteDelivery,
  useCancelDelivery,
  type DateRange,
} from "@/hooks/useCourier";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Bike, MapPin, Clock, CheckCircle2, Navigation, Users, Settings, Save,
  Loader2, CalendarIcon, Trash2, XCircle, MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format, startOfDay, endOfDay, subDays, startOfWeek, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DEFAULT_COURIER_CONFIG, type CourierConfig } from "@/hooks/useDeliveryDistance";

const statusMap: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  em_rota: { label: "Em rota", color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  entregue: { label: "Entregue", color: "bg-green-500/15 text-green-600 border-green-500/30" },
  cancelada: { label: "Cancelada", color: "bg-red-500/15 text-red-600 border-red-500/30" },
};

interface Props {
  orgId: string;
  orgSlug: string;
  courierConfig?: CourierConfig | null;
}

function useDateRange(date: Date): DateRange {
  return useMemo(() => ({
    from: startOfDay(date).toISOString(),
    to: endOfDay(date).toISOString(),
  }), [date]);
}

// Fetch order totals for profit display
function useOrderTotals(orderIds: string[]) {
  return useQuery({
    queryKey: ["order-totals", orderIds],
    queryFn: async () => {
      if (orderIds.length === 0) return {} as Record<string, number>;
      const { data, error } = await supabase
        .from("order_items")
        .select("order_id, price, quantity")
        .in("order_id", orderIds);
      if (error) throw error;
      const totals: Record<string, number> = {};
      for (const item of data ?? []) {
        totals[item.order_id] = (totals[item.order_id] || 0) + item.price * item.quantity;
      }
      return totals;
    },
    enabled: orderIds.length > 0,
  });
}

const CourierDashboardTab = ({ orgId, orgSlug, courierConfig }: Props) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateRange = useDateRange(selectedDate);

  const { data: deliveries = [], isLoading } = useOrgDeliveries(orgId, dateRange);
  const { data: couriers = [] } = useOrgCouriers(orgId);
  const qc = useQueryClient();

  const orderIds = useMemo(() => deliveries.map((d) => d.order_id), [deliveries]);
  const { data: orderTotals = {} } = useOrderTotals(orderIds);

  const deleteMutation = useDeleteDelivery();
  const clearMutation = useClearDeliveryHistory();
  const completeMutation = useCompleteDelivery();
  const cancelMutation = useCancelDelivery();

  const [baseFee, setBaseFee] = useState(courierConfig?.base_fee ?? DEFAULT_COURIER_CONFIG.base_fee);
  const [perKm, setPerKm] = useState(courierConfig?.per_km ?? DEFAULT_COURIER_CONFIG.per_km);

  useEffect(() => {
    if (courierConfig) {
      setBaseFee(courierConfig.base_fee);
      setPerKm(courierConfig.per_km);
    }
  }, [courierConfig]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("organizations")
        .update({ courier_config: { base_fee: baseFee, per_km: perKm } } as any)
        .eq("id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organization"] });
      toast.success("Configurações do motoboy salvas!");
    },
    onError: () => toast.error("Erro ao salvar configurações"),
  });

  const courierMap = new Map(couriers.map((c) => [c.id, c]));

  const activeDeliveries = deliveries.filter((d) => d.status !== "entregue" && d.status !== "cancelada");
  const completedDeliveries = deliveries.filter((d) => d.status === "entregue" || d.status === "cancelada");

  // ── Summary by courier ──
  const summary = useMemo(() => {
    const map = new Map<string, { name: string; count: number; km: number; fee: number }>();
    for (const d of deliveries.filter((x) => x.status === "entregue")) {
      const key = d.courier_id || "sem_motoboy";
      const existing = map.get(key) || { name: d.courier_id ? courierMap.get(d.courier_id)?.name || "Desconhecido" : "Sem motoboy", count: 0, km: 0, fee: 0 };
      existing.count += 1;
      existing.km += d.distance_km ?? 0;
      existing.fee += d.fee ?? 0;
      map.set(key, existing);
    }
    return Array.from(map.values());
  }, [deliveries, courierMap]);

  const totalSummary = useMemo(() => summary.reduce((acc, s) => ({ count: acc.count + s.count, km: acc.km + s.km, fee: acc.fee + s.fee }), { count: 0, km: 0, fee: 0 }), [summary]);

  const courierLink = `${window.location.origin}/motoboy?org=${orgSlug}`;

  const quickDates = [
    { label: "Hoje", fn: () => new Date() },
    { label: "Ontem", fn: () => subDays(new Date(), 1) },
    { label: "Semana", fn: () => startOfWeek(new Date(), { weekStartsOn: 1 }) },
    { label: "Mês", fn: () => startOfMonth(new Date()) },
  ];

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

      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="w-4 h-4" />
              {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        {quickDates.map((q) => (
          <Button key={q.label} variant="ghost" size="sm" onClick={() => setSelectedDate(q.fn())} className="text-xs">
            {q.label}
          </Button>
        ))}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs text-destructive ml-auto gap-1">
              <Trash2 className="w-3 h-3" /> Limpar Histórico
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Limpar histórico?</AlertDialogTitle>
              <AlertDialogDescription>
                Isto removerá todas as entregas concluídas ou canceladas anteriores a {format(selectedDate, "dd/MM/yyyy")}. Essa ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                clearMutation.mutate({ orgId, before: startOfDay(selectedDate).toISOString() }, {
                  onSuccess: () => toast.success("Histórico limpo!"),
                  onError: () => toast.error("Erro ao limpar histórico."),
                });
              }}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Fee config */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Taxa do motoboy</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Taxa base (por corrida)</label>
              <CurrencyInput value={baseFee} onChange={setBaseFee} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Valor por km rodado</label>
              <CurrencyInput value={perKm} onChange={setPerKm} />
            </div>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="sm" className="mt-3">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </Button>
        </CardContent>
      </Card>

      {/* Courier link */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-1">Link para cadastro de motoboys:</p>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted px-3 py-2 rounded-lg flex-1 break-all">{courierLink}</code>
            <button onClick={() => { navigator.clipboard.writeText(courierLink); toast.success("Copiado!"); }} className="text-xs text-primary font-medium shrink-0 hover:underline">
              Copiar
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <Users className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
          <p className="text-2xl font-bold">{couriers.length}</p>
          <p className="text-xs text-muted-foreground">Motoboys</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Clock className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
          <p className="text-2xl font-bold">{deliveries.filter((d) => d.status === "pendente").length}</p>
          <p className="text-xs text-muted-foreground">Pendentes</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Navigation className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold">{deliveries.filter((d) => d.status === "em_rota").length}</p>
          <p className="text-xs text-muted-foreground">Em rota</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-bold">{deliveries.filter((d) => d.status === "entregue").length}</p>
          <p className="text-xs text-muted-foreground">Entregues</p>
        </CardContent></Card>
      </div>

      {/* Day summary */}
      {summary.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-3">📊 Resumo do Dia</h3>
            <div className="space-y-2">
              {summary.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground">{s.count} entregas · {s.km.toFixed(1)} km · <span className="text-primary font-semibold">R$ {s.fee.toFixed(2)}</span></span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm font-bold pt-1">
                <span>Total</span>
                <span>{totalSummary.count} entregas · {totalSummary.km.toFixed(1)} km · <span className="text-primary">R$ {totalSummary.fee.toFixed(2)}</span></span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
              const orderTotal = orderTotals[d.order_id];
              const profit = orderTotal != null && d.fee != null ? orderTotal - d.fee : null;
              return (
                <Card key={d.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
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
                          <p className="text-xs mt-1"><Bike className="w-3 h-3 inline mr-1" />{courierName}</p>
                        )}
                        {orderTotal != null && (
                          <p className="text-xs mt-1 text-muted-foreground">
                            Pedido: R$ {orderTotal.toFixed(2)} | Motoboy: R$ {(d.fee ?? 0).toFixed(2)}
                            {profit != null && <> | <span className="text-primary font-semibold">Lucro: R$ {profit.toFixed(2)}</span></>}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {d.fee != null && <span className="text-sm font-semibold text-primary text-right">R$ {d.fee.toFixed(2)}</span>}
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" title="Concluir"
                            onClick={() => completeMutation.mutate(d.id, { onSuccess: () => toast.success("Entrega concluída!"), onError: () => toast.error("Erro") })}>
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" title="Cancelar"
                            onClick={() => cancelMutation.mutate(d.id, { onSuccess: () => toast.success("Entrega cancelada."), onError: () => toast.error("Erro") })}>
                            <XCircle className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" title="Excluir">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir entrega?</AlertDialogTitle>
                                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(d.id, { onSuccess: () => toast.success("Entrega excluída."), onError: () => toast.error("Erro ao excluir.") })}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed deliveries */}
      {completedDeliveries.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3">Concluídas / Canceladas</h3>
          <div className="space-y-2">
            {completedDeliveries.map((d) => {
              const s = statusMap[d.status] ?? statusMap.entregue;
              const courierName = d.courier_id ? courierMap.get(d.courier_id)?.name : null;
              const orderTotal = orderTotals[d.order_id];
              const profit = orderTotal != null && d.fee != null ? orderTotal - d.fee : null;
              return (
                <Card key={d.id} className={d.status === "cancelada" ? "opacity-60" : ""}>
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
                      {courierName && <p className="text-xs mt-1"><Bike className="w-3 h-3 inline mr-1" />{courierName}</p>}
                      {orderTotal != null && (
                        <p className="text-xs mt-1 text-muted-foreground">
                          Pedido: R$ {orderTotal.toFixed(2)} | Motoboy: R$ {(d.fee ?? 0).toFixed(2)}
                          {profit != null && <> | <span className="text-primary font-semibold">Lucro: R$ {profit.toFixed(2)}</span></>}
                        </p>
                      )}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground shrink-0" title="Excluir">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir entrega?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(d.id, { onSuccess: () => toast.success("Entrega excluída."), onError: () => toast.error("Erro ao excluir.") })}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

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
                    {c.whatsapp && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MessageCircle className="w-3 h-3" /> {c.whatsapp}
                      </p>
                    )}
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
