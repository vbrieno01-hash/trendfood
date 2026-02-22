import { useState } from "react";
import { useOrders, useUpdateOrderStatus, useDeliveredUnpaidOrders, useMarkAsPaid, useAwaitingPaymentOrders, useConfirmPixPayment } from "@/hooks/useOrders";
import type { Order } from "@/hooks/useOrders";
import { Button } from "@/components/ui/button";
import { BellRing, Loader2, CreditCard, MessageCircle, Clock, Printer, QrCode } from "lucide-react";
import { printOrder } from "@/lib/printOrder";
import { buildPixPayload } from "@/lib/pixPayload";

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
}

export default function WaiterTab({ orgId, whatsapp, orgName, pixConfirmationMode, pixKey }: WaiterTabProps) {
  const { data: readyOrders = [], isLoading: loadingReady } = useOrders(orgId, ["ready"]);
  const { data: unpaidOrders = [], isLoading: loadingUnpaid } = useDeliveredUnpaidOrders(orgId);
  const { data: awaitingOrders = [], isLoading: loadingAwaiting } = useAwaitingPaymentOrders(orgId);
  const updateStatus = useUpdateOrderStatus(orgId, ["ready"]);
  const markAsPaid = useMarkAsPaid(orgId);
  const confirmPix = useConfirmPixPayment(orgId);

  const [loadingDeliver, setLoadingDeliver] = useState<Set<string>>(new Set());
  const [loadingPay, setLoadingPay] = useState<Set<string>>(new Set());
  const [loadingConfirmPix, setLoadingConfirmPix] = useState<Set<string>>(new Set());

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
  const showAwaitingSection = pixConfirmationMode === "manual" && awaitingOrders.length > 0;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* ── SEÇÃO: Aguardando Pagamento PIX (modo manual) ─────────── */}
      {showAwaitingSection && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-orange-600" />
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

      {/* ── SEÇÃO: Prontos para entrega ───────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-green-600" />
            <h2 className="font-bold text-foreground text-xl">Prontos para Entrega</h2>
            <span className="ml-1 text-sm text-muted-foreground">
              {readyOrders.length} pedido{readyOrders.length !== 1 ? "s" : ""}
            </span>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            ao vivo
          </span>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground animate-pulse text-center py-8">Carregando…</p>
        ) : readyOrders.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-2xl">
            <p className="text-4xl mb-3">🛎️</p>
            <p className="font-semibold text-foreground">Nenhum pedido pronto!</p>
            <p className="text-muted-foreground text-sm mt-1">Os pedidos prontos aparecerão aqui em tempo real.</p>
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
                      onClick={() => {
                        const total = calcTotal(order);
                        const pix = pixKey && total > 0 ? buildPixPayload(pixKey, total, orgName ?? "LOJA") : undefined;
                        printOrder(order, orgName, pix);
                      }}
                      title="Imprimir comanda"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Imprimir
                    </Button>
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

      {/* ── SEÇÃO: Aguardando Pagamento ───────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-yellow-600" />
          <h2 className="font-bold text-foreground text-xl">Aguardando Pagamento</h2>
          {unpaidOrders.length > 0 && (
            <span className="ml-1 text-sm font-semibold text-yellow-700 bg-yellow-100 border border-yellow-200 rounded-full px-2.5 py-0.5">
              {unpaidOrders.length}
            </span>
          )}
        </div>

        {!isLoading && unpaidOrders.length === 0 ? (
          <div className="text-center py-10 bg-card border border-border rounded-2xl">
            <p className="text-3xl mb-2">✅</p>
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
                    {/* Total em destaque */}
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

                  {/* Formas aceitas */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>💳</span>
                    <span>Dinheiro · Pix · Cartão</span>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {/* Imprimir comanda */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => {
                        const total = calcTotal(order);
                        const pix = pixKey && total > 0 ? buildPixPayload(pixKey, total, orgName ?? "LOJA") : undefined;
                        printOrder(order, orgName, pix);
                      }}
                      title="Imprimir comanda com QR Pix"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Imprimir
                    </Button>

                    {/* Enviar conta via WhatsApp */}
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border-2 border-green-500 text-green-700 bg-green-50 hover:bg-green-100 transition-colors text-sm font-semibold py-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Enviar Conta
                    </a>

                    {/* Confirmar pagamento */}
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
    </div>
  );
}
