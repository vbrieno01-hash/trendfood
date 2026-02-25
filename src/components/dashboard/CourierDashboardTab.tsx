import { useState, useEffect, useMemo } from "react";
import {
  useOrgDeliveries,
  useOrgCouriers,
  useDeleteDelivery,
  useClearDeliveryHistory,
  useCompleteDelivery,
  useCancelDelivery,
  useOrgDeliveriesUnpaid,
  usePayCourier,
  useOrgActiveShifts,
  useOrgShiftHistory,
  type DateRange,
  type CourierShift,
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
  Loader2, CalendarIcon, Trash2, XCircle, MessageCircle, DollarSign, Copy, ChevronDown, ChevronUp, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { format, startOfDay, endOfDay, subDays, startOfWeek, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DEFAULT_COURIER_CONFIG, type CourierConfig } from "@/hooks/useDeliveryDistance";
import { QRCodeSVG } from "qrcode.react";
import { buildPixPayload } from "@/lib/pixPayload";
import CourierReportSection from "./CourierReportSection";
import { recalculateNullDistances } from "@/hooks/useCreateDelivery";

const statusMap: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  em_rota: { label: "Em rota", color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  entregue: { label: "Entregue", color: "bg-green-500/15 text-green-600 border-green-500/30" },
  cancelada: { label: "Cancelada", color: "bg-red-500/15 text-red-600 border-red-500/30" },
};

interface Props {
  orgId: string;
  orgSlug: string;
  orgName?: string;
  orgEmoji?: string;
  orgLogo?: string | null;
  orgWhatsapp?: string | null;
  orgAddress?: string | null;
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

const CourierDashboardTab = ({ orgId, orgSlug, orgName, orgEmoji, orgLogo, orgWhatsapp, orgAddress, courierConfig }: Props) => {
  const [expandedCourierId, setExpandedCourierId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAllActive, setShowAllActive] = useState(false);
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [showAllCouriers, setShowAllCouriers] = useState(false);
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
  const payMutation = usePayCourier();

  const { data: unpaidDeliveries = [] } = useOrgDeliveriesUnpaid(orgId);
  const { data: activeShifts = [] } = useOrgActiveShifts(orgId);
  const { data: shiftHistory = [] } = useOrgShiftHistory(orgId, dateRange);

  const activeShiftMap = useMemo(() => {
    const map = new Map<string, CourierShift>();
    for (const s of activeShifts) map.set(s.courier_id, s);
    return map;
  }, [activeShifts]);

  const shiftsByCourier = useMemo(() => {
    const map = new Map<string, CourierShift[]>();
    for (const s of shiftHistory) {
      const arr = map.get(s.courier_id) || [];
      arr.push(s);
      map.set(s.courier_id, arr);
    }
    return map;
  }, [shiftHistory]);

  const [baseFee, setBaseFee] = useState(courierConfig?.base_fee ?? DEFAULT_COURIER_CONFIG.base_fee);
  const [perKm, setPerKm] = useState(courierConfig?.per_km ?? DEFAULT_COURIER_CONFIG.per_km);
  const [dailyRate, setDailyRate] = useState(courierConfig?.daily_rate ?? DEFAULT_COURIER_CONFIG.daily_rate ?? 0);

  useEffect(() => {
    if (courierConfig) {
      setBaseFee(courierConfig.base_fee);
      setPerKm(courierConfig.per_km);
      setDailyRate(courierConfig.daily_rate ?? 0);
    }
  }, [courierConfig]);

  // Auto-close expanded card when unpaidTotal reaches 0
  useEffect(() => {
    if (!expandedCourierId) return;
    const unpaid = unpaidDeliveries.filter((d) => d.courier_id === expandedCourierId);
    const unpaidTotal = unpaid.reduce((sum, d) => sum + (d.fee ?? 0), 0);
    if (unpaidTotal <= 0) {
      setExpandedCourierId(null);
    }
  }, [expandedCourierId, unpaidDeliveries]);

  // Retroactive: recalculate distance_km for historical deliveries with null values
  useEffect(() => {
    if (!orgAddress || !orgId) return;
    const hasNullKm = deliveries.some((d) => d.status === "entregue" && d.distance_km === null);
    if (!hasNullKm) return;
    recalculateNullDistances(orgId, orgAddress, courierConfig).then((fixed) => {
      if (fixed > 0) {
        qc.invalidateQueries({ queryKey: ["org-deliveries"] });
        console.log(`[courier] Recalculated ${fixed} deliveries with missing km`);
      }
    });
  }, [orgId, orgAddress, courierConfig, deliveries, qc]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("organizations")
        .update({ courier_config: { base_fee: baseFee, per_km: perKm, daily_rate: dailyRate } } as any)
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

  const courierLink = `https://trendfood.lovable.app/motoboy?org=${orgSlug}`;

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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Taxa base (por corrida)</label>
              <CurrencyInput value={baseFee} onChange={setBaseFee} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Valor por km rodado</label>
              <CurrencyInput value={perKm} onChange={setPerKm} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Diária (por dia)</label>
              <CurrencyInput value={dailyRate} onChange={setDailyRate} />
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
            {activeDeliveries.slice(0, showAllActive ? undefined : 3).map((d) => {
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
            {activeDeliveries.length > 3 && (
              <button
                onClick={() => setShowAllActive(!showAllActive)}
                className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground py-2 px-4 rounded-full border border-border hover:border-foreground/20 transition-colors mx-auto"
              >
                {showAllActive ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showAllActive ? "Ver menos" : `Ver mais ${activeDeliveries.length - 3} entregas`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Completed deliveries */}
      {completedDeliveries.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3">Concluídas / Canceladas</h3>
          <div className="space-y-2">
            {completedDeliveries.slice(0, showAllCompleted ? undefined : 3).map((d) => {
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
            {completedDeliveries.length > 3 && (
              <button
                onClick={() => setShowAllCompleted(!showAllCompleted)}
                className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground py-2 px-4 rounded-full border border-border hover:border-foreground/20 transition-colors mx-auto"
              >
                {showAllCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showAllCompleted ? "Ver menos" : `Ver mais ${completedDeliveries.length - 3} entregas`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Couriers list */}
      {couriers.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3">Motoboys cadastrados</h3>
          <div className="space-y-2">
            {couriers.slice(0, showAllCouriers ? undefined : 5).map((c) => {
              const unpaid = unpaidDeliveries.filter((d) => d.courier_id === c.id);
              const unpaidTotal = unpaid.reduce((sum, d) => sum + (d.fee ?? 0), 0);
              const isExpanded = expandedCourierId === c.id;
              const pixPayload = c.pix_key && unpaidTotal > 0 ? buildPixPayload(c.pix_key, unpaidTotal, c.name) : null;
              return (
                <Card key={c.id}>
                  <CardContent className="p-3">
                    <div
                      className={cn("flex items-center gap-3", unpaidTotal > 0 && "cursor-pointer")}
                      onClick={() => unpaidTotal > 0 && setExpandedCourierId(isExpanded ? null : c.id)}
                    >
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0 relative">
                        <Bike className="w-4 h-4 text-primary" />
                        <span className={cn(
                          "absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                          activeShiftMap.has(c.id) ? "bg-green-500" : "bg-red-400"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.phone} · {c.plate}</p>
                        {activeShiftMap.has(c.id) && (() => {
                          const shift = activeShiftMap.get(c.id)!;
                          const mins = Math.floor((Date.now() - new Date(shift.started_at).getTime()) / 60_000);
                          const hrs = Math.floor(mins / 60);
                          const startTime = new Date(shift.started_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                          return (
                            <p className="text-xs text-green-600 mt-0.5">
                              🟢 Entrou às {startTime} · Há {hrs > 0 ? `${hrs}h${mins % 60 > 0 ? `${mins % 60}min` : ""}` : `${mins}min`} trabalhando
                            </p>
                          );
                        })()}
                        {c.whatsapp && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MessageCircle className="w-3 h-3" /> {c.whatsapp}
                          </p>
                        )}
                        {unpaidTotal > 0 && (
                          <p className="text-xs mt-1 flex items-center gap-1">
                            <DollarSign className="w-3 h-3 text-yellow-500" />
                            <span className="text-yellow-600 font-semibold">
                              {unpaid.length} entrega{unpaid.length > 1 ? "s" : ""} · R$ {unpaidTotal.toFixed(2)} a pagar
                            </span>
                          </p>
                        )}
                      </div>
                      {unpaidTotal > 0 && (
                        <div className="shrink-0">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      )}
                    </div>

                    {/* Expanded PIX payment section */}
                    {isExpanded && unpaidTotal > 0 && (
                      <div className="mt-4 pt-4 border-t border-border space-y-4">
                        {pixPayload ? (
                          <div className="flex flex-col items-center gap-3">
                            <p className="text-sm font-medium text-center">QR Code PIX — R$ {unpaidTotal.toFixed(2)}</p>
                            <div className="bg-white p-3 rounded-lg">
                              <QRCodeSVG value={pixPayload} size={200} />
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(pixPayload);
                                toast.success("Pix Copia e Cola copiado!");
                              }}
                            >
                              <Copy className="w-4 h-4" />
                              Copiar Pix Copia e Cola
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 bg-yellow-500/10 text-yellow-700 rounded-lg p-3 text-sm">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            Motoboy não cadastrou chave PIX
                          </div>
                        )}

                        <Button
                          className="w-full gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            payMutation.mutate({ courierId: c.id, organizationId: orgId }, {
                              onSuccess: () => toast.success(`Pagamento de R$ ${unpaidTotal.toFixed(2)} registrado para ${c.name}!`),
                              onError: () => toast.error("Erro ao registrar pagamento."),
                            });
                          }}
                          disabled={payMutation.isPending}
                        >
                          {payMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Confirmar Pagamento
                        </Button>

                        {/* Shift history for this courier */}
                        {(shiftsByCourier.get(c.id) || []).length > 0 && (
                          <div className="pt-3 border-t border-border">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Turnos do dia</p>
                            <div className="space-y-1">
                              {(shiftsByCourier.get(c.id) || []).map((s) => (
                                <div key={s.id} className="flex items-center justify-between text-xs">
                                  <span>
                                    {new Date(s.started_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                    {" → "}
                                    {s.ended_at ? new Date(s.ended_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "em andamento"}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {s.ended_at
                                      ? `${Math.floor((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 3_600_000)}h${Math.floor(((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) % 3_600_000) / 60_000)}min`
                                      : "ativo"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {couriers.length > 5 && (
              <button
                onClick={() => setShowAllCouriers(!showAllCouriers)}
                className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground py-2 px-4 rounded-full border border-border hover:border-foreground/20 transition-colors mx-auto"
              >
                {showAllCouriers ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showAllCouriers ? "Ver menos" : `Ver mais ${couriers.length - 5} motoboys`}
              </button>
            )}
          </div>
        </div>
      )}
      {/* Relatório de Motoboys */}
      <div className="border-t border-border pt-6 mt-6">
        <CourierReportSection
          orgId={orgId}
          orgName={orgName || "Minha Loja"}
          orgEmoji={orgEmoji || "🍽️"}
          orgLogo={orgLogo}
          orgWhatsapp={orgWhatsapp}
          orgAddress={orgAddress}
        />
      </div>
    </div>
  );
};

export default CourierDashboardTab;
