import { useState } from "react";
import { useOrders, useUpdateOrderStatus, useDeliveredUnpaidOrders, useMarkAsPaid, useAwaitingPaymentOrders, useConfirmPixPayment, useCancelOrder } from "@/hooks/useOrders";
import type { Order } from "@/hooks/useOrders";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BellRing, Loader2, CreditCard, MessageCircle, Clock, Printer, QrCode, Flame, Trash2 } from "lucide-react";
import { printOrderByMode } from "@/lib/printOrder";
import { buildPixPayload } from "@/lib/pixPayload";
import KitchenTab from "@/components/dashboard/KitchenTab";

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const calcTotal = (order: Order) =>
  (order.order_items ?? []).reduce((acc, i) => acc + i.price * i.quantity, 0);

const buildWhatsAppMessage = (order: Order, whatsapp?: string | null): string => {
  const items = (order.order_items ?? [])
    .map((i) => {
      const name = i.name.padEnd(20, " ");
      const price = fmtBRL(i.price * i.quantity);
      return `${i.quantity}× ${name} ${price}`;
    })
    .join("\n");

  const total = fmtBRL(calcTotal(order));

  const text = [
    `🧾 *Conta da Mesa ${order.table_number}*`,
    "",
    items,
    "─────────────────────",
    `*Total: ${total}*`,
    "",
    "💳 Formas de pagamento aceitas:",
    "Dinheiro | Pix | Cartão",
    "",
    "Obrigado pela visita! 😊",
  ].join("\n");

  const encoded = encodeURIComponent(text);
  const phone = whatsapp ? whatsapp.replace(/\D/g, "") : "";
  return phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
};

interface WaiterTabProps {
  orgId: string;
  whatsapp?: string | null;
  orgName?: string;
  pixConfirmationMode?: "direct" | "manual" | "automatic";
  pixKey?: string | null;
  storeAddress?: string | null;
  courierConfig?: { base_fee: number; per_km: number } | null;
  printMode?: 'browser' | 'desktop' | 'bluetooth';
  printerWidth?: '58mm' | '80mm';
  btDevice?: BluetoothDevice | null;
  onPairBluetooth?: () => void;
  btConnected?: boolean;
  btSupported?: boolean;
  autoPrint: boolean;
  onToggleAutoPrint: (val: boolean) => void;
  notificationsEnabled: boolean;
  onToggleNotifications: (val: boolean) => void;
  embedded?: boolean;
  /** Render only a specific section instead of all */
  section?: "ready" | "unpaid" | "all";
}

export default function WaiterTab({
  orgId, whatsapp, orgName, pixConfirmationMode, pixKey,
  storeAddress, courierConfig, printMode = 'browser', printerWidth = '58mm', btDevice = null,
  onPairBluetooth, btConnected, btSupported,
  autoPrint, onToggleAutoPrint, notificationsEnabled, onToggleNotifications,
  embedded = false, section = "all",
}: WaiterTabProps) {
  const [showKds, setShowKds] = useState(false);
  const { data: readyOrders = [], isLoading: loadingReady } = useOrders(orgId, ["ready"]);
  const { data: unpaidOrders = [], isLoading: loadingUnpaid } = useDeliveredUnpaidOrders(orgId);
  const { data: awaitingOrders = [], isLoading: loadingAwaiting } = useAwaitingPaymentOrders(orgId);
  const updateStatus = useUpdateOrderStatus(orgId, ["ready"]);
  const markAsPaid = useMarkAsPaid(orgId);
  const confirmPix = useConfirmPixPayment(orgId);
  const cancelOrder = useCancelOrder(orgId);

  const [loadingDeliver, setLoadingDeliver] = useState<Set<string>>(new Set());
  const [loadingPay, setLoadingPay] = useState<Set<string>>(new Set());
  const [loadingConfirmPix, setLoadingConfirmPix] = useState<Set<string>>(new Set());

  const handlePrintOrder = (order: Order) => {
    const total = calcTotal(order);
    const pix = pixKey && total > 0 ? buildPixPayload(pixKey, total, orgName ?? "LOJA") : undefined;
    printOrderByMode(order, orgName, printMode, orgId, btDevice, pix, printerWidth);
  };

  const handleDeliver = (id: string) => {
    if (loadingDeliver.has(id)) return;
    setLoadingDeliver((prev) => new Set(prev).add(id));
    updateStatus.mutate(
      { id, status: "delivered" },
      {
        onSettled: () => {
          setTimeout(() => {
            setLoadingDeliver((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }, 800);
        },
      }
    );
  };

  const handlePay = (id: string) => {
    if (loadingPay.has(id)) return;
    setLoadingPay((prev) => new Set(prev).add(id));
    markAsPaid.mutate(id, {
      onSettled: () => {
        setLoadingPay((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      },
    });
  };

  const handleConfirmPix = (id: string) => {
    if (loadingConfirmPix.has(id)) return;
    setLoadingConfirmPix((prev) => new Set(prev).add(id));
    confirmPix.mutate(id, {
      onSettled: () => {
        setLoadingConfirmPix((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      },
    });
  };

  const isLoading = loadingReady || loadingUnpaid || loadingAwaiting;
  const showReadySection = section === "all" || section === "ready";
  const showUnpaidSection = section === "all" || section === "unpaid";
  const showPixSection = showReadySection && pixConfirmationMode === "manual" && awaitingOrders.length > 0;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* ── SEÇÃO: Aguardando Pagamento PIX (modo manual) ─────────── */}
      {showPixSection && (
        <div className="space-y-4 animate-dashboard-fade-in">
          <div className="flex items-center gap-3">
            <div className="dashboard-section-icon !bg-orange-500">
              <QrCode className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-foreground text-xl">Aguardando PIX</h2>
            <span className="ml-1 text-sm font-semibold text-orange-700 bg-orange-100 border border-orange-200 rounded-full px-2.5 py-0.5">
              {awaitingOrders.length}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {awaitingOrders.map((order) => {
              const busyPix = loadingConfirmPix.has(order.id);
              const total = calcTotal(order);
              return (
                <div
                  key={order.id}
                  className="rounded-2xl border-2 border-orange-400 bg-card p-5 space-y-3 shadow-md shadow-orange-50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold bg-orange-500 text-white rounded-full px-2.5 py-0.5">
                          ⏳ PIX
                        </span>
                        <span className="font-bold text-foreground text-lg">Mesa {order.table_number}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{fmtTime(order.created_at)}</p>
                    </div>
                    <span className="font-black text-orange-700 text-lg">{fmtBRL(total)}</span>
                  </div>

                  <ul className="space-y-1">
                    {(order.order_items ?? []).map((item) => (
                      <li key={item.id} className="flex items-center gap-2 text-sm text-foreground">
                        <span className="w-6 h-6 rounded-md bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {item.quantity}×
                        </span>
                        <span>{item.name}</span>
                        {(item as any).customer_name && (
                          <span className="text-xs text-muted-foreground">— {(item as any).customer_name}</span>
                        )}
                      </li>
                    ))}
                  </ul>

                  {order.notes && (
                    <div className="bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Obs:</span> {order.notes}
                    </div>
                  )}

                  <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-700">
                    ⚠️ Confirme que o PIX caiu na sua conta antes de liberar para a cozinha.
                  </div>

                  <Button
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                    disabled={busyPix}
                    onClick={() => handleConfirmPix(order.id)}
                  >
                    {busyPix ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <>
                        <QrCode className="w-4 h-4 mr-1.5" />
                        Confirmar PIX — Enviar pra Cozinha
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showReadySection && (
      <div className="space-y-4 animate-dashboard-fade-in dash-delay-1">
        {section === "all" && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="dashboard-section-icon !bg-green-500">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-xl">Prontos para Entrega</h2>
              <span className="text-sm text-muted-foreground">
                {readyOrders.length} pedido{readyOrders.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            ao vivo
          </span>
        </div>
        )}
        {section !== "all" && (
          <p className="text-sm text-muted-foreground">
            {readyOrders.length} pedido{readyOrders.length !== 1 ? "s" : ""}
          </p>
        )}

        {isLoading ? (
          <p className="text-muted-foreground animate-pulse text-center py-8">Carregando…</p>
        ) : readyOrders.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-2xl">
            <div className="relative mx-auto w-24 h-24 mb-3">
              <div className="animate-[float_3s_ease-in-out_infinite]">
                <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-24 h-24">
                  <circle cx="60" cy="60" r="50" fill="url(#bellGlow)" className="animate-[pulse_3s_ease-in-out_infinite]" />
                  <path d="M60 28 C60 28 42 28 42 50 L42 68 L34 78 L86 78 L78 68 L78 50 C78 28 60 28 60 28Z" fill="hsl(var(--primary))" className="animate-[bellRing_2s_ease-in-out_infinite]" style={{transformOrigin: '60px 28px'}} />
                  <circle cx="60" cy="85" r="6" fill="hsl(var(--primary))" />
                  <line x1="60" y1="20" x2="60" y2="28" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="60" cy="18" r="3" fill="hsl(var(--primary))" />
                  <path d="M30 38 L24 34" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" className="animate-[bellWave_2s_ease-in-out_infinite]" opacity="0.5" />
                  <path d="M90 38 L96 34" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" className="animate-[bellWave_2s_ease-in-out_0.3s_infinite]" opacity="0.5" />
                  <path d="M26 48 L20 48" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" className="animate-[bellWave_2s_ease-in-out_0.6s_infinite]" opacity="0.3" />
                  <path d="M94 48 L100 48" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" className="animate-[bellWave_2s_ease-in-out_0.9s_infinite]" opacity="0.3" />
                  <defs>
                    <radialGradient id="bellGlow" cx="0.5" cy="0.5" r="0.5">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                </svg>
              </div>
            </div>
            <p className="font-semibold text-foreground">Nenhum pedido pronto!</p>
            <p className="text-muted-foreground text-sm mt-1">Os pedidos prontos aparecerão aqui em tempo real.</p>
            <style>{`
              @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
              @keyframes bellRing { 0%, 100% { transform: rotate(0deg); } 10% { transform: rotate(8deg); } 20% { transform: rotate(-8deg); } 30% { transform: rotate(5deg); } 40% { transform: rotate(-5deg); } 50% { transform: rotate(0deg); } }
              @keyframes bellWave { 0%, 100% { opacity: 0; transform: translateX(0); } 20% { opacity: 0.7; } 50% { opacity: 0; transform: translateX(-4px); } }
            `}</style>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {readyOrders.map((order) => {
              const busy = loadingDeliver.has(order.id);
              const total = calcTotal(order);
              return (
                <div
                  key={order.id}
                  className="rounded-2xl border-2 border-green-400 bg-card p-5 space-y-3 shadow-md shadow-green-50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold bg-green-500 text-white rounded-full px-2.5 py-0.5">
                          ✅ PRONTO
                        </span>
                         <span className="font-bold text-foreground text-lg">Mesa {order.table_number}</span>
                         {(order as any).payment_method && (order as any).payment_method !== "pending" && (
                           <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${
                             (order as any).payment_method === "pix" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                           }`}>
                             {(order as any).payment_method === "pix" ? "PIX" : "Cartão"}
                           </span>
                         )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{fmtTime(order.created_at)}</p>
                    </div>
                    <span className="font-black text-green-700 text-lg">{fmtBRL(total)}</span>
                  </div>

                  <ul className="space-y-1">
                    {(order.order_items ?? []).map((item) => (
                      <li key={item.id} className="flex items-center gap-2 text-sm text-foreground">
                        <span className="w-6 h-6 rounded-md bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {item.quantity}×
                        </span>
                        <span>{item.name}</span>
                        {(item as any).customer_name && (
                          <span className="text-xs text-muted-foreground">— {(item as any).customer_name}</span>
                        )}
                      </li>
                    ))}
                  </ul>

                  {order.notes && (
                    <div className="bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Obs:</span> {order.notes}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => handlePrintOrder(order)}
                      title="Imprimir comanda"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Imprimir
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex items-center gap-1 bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          <Trash2 className="w-3.5 h-3.5" />
                          Cancelar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancelar pedido?</AlertDialogTitle>
                          <AlertDialogDescription>Deseja realmente cancelar este pedido? Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Voltar</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => cancelOrder.mutate(order.id)}>Sim, cancelar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      disabled={busy}
                      onClick={() => handleDeliver(order.id)}
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Marcar como Entregue"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {showUnpaidSection && (
      <div className="space-y-4 animate-dashboard-fade-in dash-delay-2">
        {section === "all" && (
        <div className="flex items-center gap-3">
          <div className="dashboard-section-icon !bg-yellow-500">
            <Clock className="w-5 h-5" />
          </div>
          <h2 className="font-bold text-foreground text-xl">Aguardando Pagamento</h2>
          {unpaidOrders.length > 0 && (
            <span className="text-sm font-semibold text-yellow-700 bg-yellow-100 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-full px-2.5 py-0.5">
              {unpaidOrders.length}
            </span>
          )}
        </div>
        )}
        {section !== "all" && (
          <p className="text-sm text-muted-foreground">
            {unpaidOrders.length} conta{unpaidOrders.length !== 1 ? "s" : ""} em aberto
          </p>
        )}

        {!isLoading && unpaidOrders.length === 0 ? (
          <div className="text-center py-10 bg-card border border-border rounded-2xl">
              <div className="flex justify-center mb-3">
                <div className="animate-[float_3s_ease-in-out_infinite]">
                  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16">
                    <defs>
                      <radialGradient id="paidGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="hsl(142 71% 45% / 0.2)" />
                        <stop offset="100%" stopColor="transparent" />
                      </radialGradient>
                    </defs>
                    <circle cx="60" cy="60" r="56" fill="url(#paidGlow)" className="animate-[pulse_3s_ease-in-out_infinite]" />
                    <circle cx="60" cy="60" r="36" stroke="hsl(142 71% 45%)" strokeWidth="3" fill="hsl(142 71% 45% / 0.1)" />
                    <path d="M42 60 L54 72 L78 48" stroke="hsl(142 71% 45%)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ strokeDasharray: 60, strokeDashoffset: 60, animation: 'paidCheck 0.6s ease-out 0.3s forwards' }} />
                  </svg>
                  <style>{`
                    @keyframes paidCheck { to { stroke-dashoffset: 0; } }
                  `}</style>
                </div>
              </div>
              <p className="font-semibold text-foreground text-sm">Tudo pago! Nenhuma conta em aberto.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {unpaidOrders.map((order) => {
              const busyPay = loadingPay.has(order.id);
              const total = calcTotal(order);
              const waUrl = buildWhatsAppMessage(order, whatsapp);

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border-2 border-yellow-400 bg-card p-5 space-y-3 shadow-md shadow-yellow-50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold bg-yellow-500 text-white rounded-full px-2.5 py-0.5">
                          💰 PAGAR
                        </span>
                        <span className="font-bold text-foreground text-lg">Mesa {order.table_number}</span>
                        {(order as any).payment_method && (order as any).payment_method !== "pending" && (
                          <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${
                            (order as any).payment_method === "pix" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            {(order as any).payment_method === "pix" ? "PIX" : "Cartão"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{fmtTime(order.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="font-black text-yellow-700 text-2xl leading-tight">{fmtBRL(total)}</p>
                    </div>
                  </div>

                  <ul className="space-y-1">
                    {(order.order_items ?? []).map((item) => (
                      <li key={item.id} className="flex items-center justify-between text-sm text-foreground">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-yellow-100 text-yellow-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {item.quantity}×
                          </span>
                          <span>{item.name}</span>
                          {(item as any).customer_name && (
                            <span className="text-xs text-muted-foreground">— {(item as any).customer_name}</span>
                          )}
                        </div>
                        <span className="text-muted-foreground text-xs">{fmtBRL(item.price * item.quantity)}</span>
                      </li>
                    ))}
                  </ul>

                  {order.notes && (
                    <div className="bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Obs:</span> {order.notes}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>💳</span>
                    <span>Dinheiro · Pix · Cartão</span>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => handlePrintOrder(order)}
                      title="Imprimir comanda com QR Pix"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Imprimir
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex items-center gap-1 bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          <Trash2 className="w-3.5 h-3.5" />
                          Cancelar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancelar pedido?</AlertDialogTitle>
                          <AlertDialogDescription>Deseja realmente cancelar este pedido? Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Voltar</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => cancelOrder.mutate(order.id)}>Sim, cancelar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border-2 border-green-500 text-green-700 bg-green-50 hover:bg-green-100 transition-colors text-sm font-semibold py-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Enviar Conta
                    </a>

                    <Button
                      className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold"
                      disabled={busyPay}
                      onClick={() => handlePay(order.id)}
                    >
                      {busyPay ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-1.5" />
                          Confirmar Pag.
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {!embedded && (
        <Button
          onClick={() => setShowKds(true)}
          className="fixed bottom-6 right-6 z-40 rounded-full shadow-lg gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-3 h-auto text-sm font-semibold"
        >
          <Flame className="w-4 h-4" />
          Monitor da Cozinha
        </Button>
      )}

      {/* Dialog fullscreen com KDS (hidden when embedded) */}
      {!embedded && (
        <Dialog open={showKds} onOpenChange={setShowKds}>
          <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                Monitor da Cozinha
              </DialogTitle>
            </DialogHeader>
            <KitchenTab
              orgId={orgId}
              orgName={orgName}
              storeAddress={storeAddress}
              courierConfig={courierConfig}
              printMode={printMode}
              printerWidth={printerWidth}
              btDevice={btDevice}
              pixKey={pixKey}
              onPairBluetooth={onPairBluetooth}
              btConnected={btConnected}
              btSupported={btSupported}
              autoPrint={autoPrint}
              onToggleAutoPrint={onToggleAutoPrint}
              notificationsEnabled={notificationsEnabled}
              onToggleNotifications={onToggleNotifications}
              embedded
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
