import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useOrganization } from "@/hooks/useOrganization";
import { useMenuItems } from "@/hooks/useMenuItems";
import { usePlaceOrder } from "@/hooks/useOrders";
import { validateCoupon, incrementCouponUses } from "@/hooks/useCoupons";
import type { Coupon } from "@/hooks/useCoupons";
import { useGeneratePixPayload } from "@/hooks/useGeneratePixPayload";
import { useCreatePixCharge, useCheckPixStatus } from "@/hooks/usePixAutomation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Minus, Plus, ShoppingCart, CheckCircle, ArrowLeft, Tag, X, User, Copy, CreditCard, QrCode, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

interface CartItem {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  customer_name: string;
}

const CATEGORY_ORDER = [
  "Hambúrgueres", "Bebidas", "Porções", "Sobremesas", "Combos", "Outros",
];

export default function TableOrderPage() {
  const { slug, tableNumber } = useParams<{ slug: string; tableNumber: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const _fromDashboard = location.state?.from === "dashboard";

  const { data: org, isLoading: orgLoading } = useOrganization(slug);
  const { data: items = [], isLoading: itemsLoading } = useMenuItems(org?.id);
  const placeOrder = usePlaceOrder();

  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [notes, setNotes] = useState("");
  const [success, setSuccess] = useState(false);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<null | "pix" | "card">(null);

  // People setup state
  const [setupDone, setSetupDone] = useState(false);
  const [peopleCount, setPeopleCount] = useState(1);
  const [peopleNames, setPeopleNames] = useState<string[]>([""]);
  const [activePerson, setActivePerson] = useState(0);

  // Derived customer name from active person
  const customerName = setupDone ? (peopleNames[activePerson] || "Sem nome") : "Sem nome";

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  // Automatic PIX state
  const [autoPixPaymentId, setAutoPixPaymentId] = useState<string | null>(null);
  const [autoPixQrCode, setAutoPixQrCode] = useState<string | null>(null);
  const [autoPixLoading, setAutoPixLoading] = useState(false);
  const { createCharge } = useCreatePixCharge();
  const { paid: autoPixPaid } = useCheckPixStatus(
    org?.id,
    autoPixPaymentId,
    orderId,
    !!autoPixPaymentId && paymentMethod === "pix"
  );

  // Static PIX payload from edge function
  const { generate: generatePixPayload } = useGeneratePixPayload();
  const [pixPayloadFromServer, setPixPayloadFromServer] = useState<string | null>(null);

  const pixMode = org?.pix_confirmation_mode ?? "direct";

  useEffect(() => {
    // Only generate static PIX payload for manual mode (direct mode skips QR entirely)
    if (success && org && orderTotal > 0 && !paymentMethod && pixMode === "manual") {
      generatePixPayload(org.id, orderTotal).then((p) => setPixPayloadFromServer(p));
    }
  }, [success, org?.id, orderTotal, paymentMethod, pixMode]);

  const tableNum = parseInt(tableNumber || "0", 10);

  const available = items.filter((i) => i.available);
  const byCategory = CATEGORY_ORDER.reduce<Record<string, typeof available>>(
    (acc, cat) => {
      const filtered = available.filter((i) => i.category === cat);
      if (filtered.length) acc[cat] = filtered;
      return acc;
    },
    {}
  );
  const knownCats = new Set(CATEGORY_ORDER);
  available.forEach((i) => {
    if (!knownCats.has(i.category)) {
      byCategory[i.category] = byCategory[i.category] || [];
      byCategory[i.category].push(i);
    }
  });

  const cartItems = Object.values(cart);
  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);
  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

  const discount = appliedCoupon
    ? appliedCoupon.type === "percent"
      ? subtotal * (appliedCoupon.value / 100)
      : Math.min(appliedCoupon.value, subtotal)
    : 0;

  const totalPrice = Math.max(0, subtotal - discount);

  // Cart key includes customer_name so the same item by different people is separate
  const cartKey = (itemId: string, name: string) => `${itemId}__${name}`;

  const adjust = (item: typeof available[0], delta: number) => {
    const cName = customerName;
    const key = cartKey(item.id, cName);
    setCart((prev) => {
      const existing = prev[key];
      const newQty = (existing?.quantity ?? 0) + delta;
      if (newQty <= 0) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [key]: {
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: newQty,
          customer_name: cName,
        },
      };
    });
  };

  // Get qty for current customer name
  const getQty = (itemId: string) => {
    return cart[cartKey(itemId, customerName)]?.quantity ?? 0;
  };

  // Group cart by customer_name for display
  const cartByPerson = cartItems.reduce<Record<string, CartItem[]>>((acc, item) => {
    const name = item.customer_name;
    if (!acc[name]) acc[name] = [];
    acc[name].push(item);
    return acc;
  }, {});

  // People setup handlers
  const handlePeopleCountChange = (delta: number) => {
    const newCount = Math.max(1, Math.min(10, peopleCount + delta));
    setPeopleCount(newCount);
    setPeopleNames((prev) => {
      if (newCount > prev.length) {
        return [...prev, ...Array(newCount - prev.length).fill("")];
      }
      return prev.slice(0, newCount);
    });
  };

  const handleNameChange = (index: number, value: string) => {
    setPeopleNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleStartOrder = () => {
    // Fill empty names with defaults
    const finalNames = peopleNames.map((n, i) => n.trim() || `Pessoa ${i + 1}`);
    setPeopleNames(finalNames);
    setActivePerson(0);
    setSetupDone(true);
  };

  const handleApplyCoupon = async () => {
    if (!org || !couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    const result = await validateCoupon(org.id, couponCode, subtotal);
    if (result.valid) {
      setAppliedCoupon(result.coupon);
      setCouponError("");
    } else {
      const err = result as { valid: false; reason: string };
      setCouponError(err.reason);
      setAppliedCoupon(null);
    }
    setCouponLoading(false);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  const handleFinish = async () => {
    if (!org || cartItems.length === 0) return;

    try {
      let finalNotes = notes;
      if (appliedCoupon) {
        finalNotes = finalNotes
          ? `${finalNotes} | CUPOM:${appliedCoupon.code}`
          : `CUPOM:${appliedCoupon.code}`;
      }

      const pixMode = org.pix_confirmation_mode ?? "direct";
      const needsPaymentFirst = pixMode === "automatic";
      const initialStatus = needsPaymentFirst ? "awaiting_payment" : "pending";

      const order = await placeOrder.mutateAsync({
        organizationId: org.id,
        tableNumber: tableNum,
        notes: finalNotes,
        items: cartItems,
        initialStatus,
      });

      if (appliedCoupon) {
        await incrementCouponUses(appliedCoupon.id);
      }

      setOrderId(order.id);
      setOrderTotal(totalPrice);
      setPaymentMethod(null);
      setSuccess(true);
    } catch (err) {
      console.error("[TableOrder] handleFinish error:", err);
      toast.error("Erro ao enviar pedido. Verifique sua conexão e tente novamente.");
    }
  };

  if (orgLoading || itemsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Carregando cardápio…</p>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Restaurante não encontrado.</p>
      </div>
    );
  }

  const handleSelectPayment = async (method: "pix" | "card") => {
    setPaymentMethod(method);
    if (orderId) {
      const currentPixMode = org?.pix_confirmation_mode ?? "direct";
      const isAutomatic = method === "pix" && currentPixMode === "automatic";

      if (method === "card" || (method === "pix" && currentPixMode === "direct")) {
        // Direct PIX or card: treat as "pay at table/counter", send to kitchen immediately
        const { error: updErr } = await supabase.from("orders").update({ payment_method: method, status: "pending" } as never).eq("id", orderId);
        if (updErr) console.error("[TableOrder] update payment failed:", updErr.message);
      } else {
        const { error: updErr2 } = await supabase.from("orders").update({ payment_method: method } as never).eq("id", orderId);
        if (updErr2) console.error("[TableOrder] update payment method failed:", updErr2.message);
      }

      if (isAutomatic && org) {
        setAutoPixLoading(true);
        const result = await createCharge(org.id, orderId, orderTotal, `Pedido ${org.name}`);
        if (result) {
          setAutoPixPaymentId(result.payment_id);
          setAutoPixQrCode(result.pix_copia_e_cola || result.qr_code);
        }
        setAutoPixLoading(false);
      }
    }
  };

  const resetAll = () => {
    setCart({});
    setNotes("");
    setSuccess(false);
    setAppliedCoupon(null);
    setCouponCode("");
    setOrderTotal(0);
    setPaymentMethod(null);
    setOrderId(null);
    setAutoPixPaymentId(null);
    setAutoPixQrCode(null);
  };

  // ── Success / Payment screens ──────────────────────────────────────────
  if (success) {
    const pixPayload = pixPayloadFromServer;

    if (!paymentMethod) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center space-y-6 max-w-sm w-full">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Pedido enviado! 🎉</h1>
            <p className="text-muted-foreground">
              Mesa <strong>{tableNum}</strong> — R$ {orderTotal.toFixed(2).replace(".", ",")}
            </p>
            <p className="text-sm font-medium text-foreground">Como deseja pagar?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleSelectPayment("pix")}
                disabled={pixMode === "manual" && !pixPayload}
                className="flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-border bg-card hover:border-green-400 hover:bg-green-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <QrCode className="w-10 h-10 text-green-600" />
                <span className="font-bold text-sm text-foreground">Pagar com PIX</span>
                <span className="text-xs text-muted-foreground">{pixMode === "direct" ? "Pague na hora" : "Pague agora"}</span>
              </button>
              <button
                onClick={() => handleSelectPayment("card")}
                className="flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-border bg-card hover:border-blue-400 hover:bg-blue-50 transition-all"
              >
                <CreditCard className="w-10 h-10 text-blue-600" />
                <span className="font-bold text-sm text-foreground">Cartão</span>
                <span className="text-xs text-muted-foreground">Pague no final</span>
              </button>
            </div>
            {!pixPayload && (
              <p className="text-xs text-muted-foreground">PIX indisponível — chave não configurada.</p>
            )}
          </div>
        </div>
      );
    }

    if (paymentMethod === "pix") {
      const currentPixMode = org.pix_confirmation_mode ?? "direct";
      const isAutomatic = currentPixMode === "automatic";

      // Direct mode: PIX is "pay at table", show simple confirmation like card
      if (currentPixMode === "direct") {
        return (
          <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="text-center space-y-4 max-w-sm w-full">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h1 className="text-2xl font-bold text-foreground">Pedido enviado! 🎉</h1>
              <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
                <QrCode className="w-12 h-12 text-green-500 mx-auto" />
                <p className="font-bold text-foreground text-lg">Pagamento via PIX</p>
                <p className="text-sm text-muted-foreground">Pague na hora com PIX. Seu pedido já foi para a cozinha! 🍽️</p>
              </div>
              <Button variant="ghost" onClick={resetAll} className="w-full text-sm text-muted-foreground">
                Fazer outro pedido nesta mesa
              </Button>
            </div>
          </div>
        );
      }

      if (isAutomatic) {
        if (autoPixLoading) {
          return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
              <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground">Gerando QR Code PIX...</p>
              </div>
            </div>
          );
        }

        if (autoPixPaid) {
          return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
              <div className="text-center space-y-4 max-w-sm w-full">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <h1 className="text-2xl font-bold text-foreground">Pagamento confirmado! ✅</h1>
                <p className="text-muted-foreground">Seu pedido foi enviado para a cozinha. Bom apetite! 🍽️</p>
                <Button variant="ghost" onClick={resetAll} className="w-full text-sm text-muted-foreground">
                  Fazer outro pedido nesta mesa
                </Button>
              </div>
            </div>
          );
        }

        const dynamicQr = autoPixQrCode;
        return (
          <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="text-center space-y-4 max-w-sm w-full">
              <h1 className="text-2xl font-bold text-foreground">Pague com PIX</h1>
              <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
                <p className="text-2xl font-black text-primary">
                  R$ {orderTotal.toFixed(2).replace(".", ",")}
                </p>
                {dynamicQr ? (
                  <>
                    <div className="flex justify-center">
                      <QRCodeSVG value={dynamicQr} size={200} />
                    </div>
                    <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Aguardando pagamento...
                    </div>
                    <Button
                      variant="outline" size="sm" className="w-full"
                      onClick={() => {
                        const copyText = (text: string) => {
                          if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
                            navigator.clipboard.writeText(text).then(() => toast.success("Código PIX copiado!")).catch(() => {
                              const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); toast.success("Código PIX copiado!");
                            });
                          } else {
                            const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); toast.success("Código PIX copiado!");
                          }
                        };
                        copyText(dynamicQr);
                      }}
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      Copiar código Pix
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-destructive">Erro ao gerar QR Code. Tente novamente.</p>
                )}
              </div>
              <Button variant="ghost" onClick={resetAll} className="w-full text-sm text-muted-foreground">
                Fazer outro pedido nesta mesa
              </Button>
            </div>
          </div>
        );
      }

      if (!pixPayload) {
        return (
          <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="text-center space-y-4 max-w-sm w-full">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h1 className="text-2xl font-bold text-foreground">Pedido enviado! 🎉</h1>
              <p className="text-muted-foreground">PIX indisponível — chave não configurada.</p>
              <Button variant="ghost" onClick={resetAll} className="w-full text-sm text-muted-foreground">
                Fazer outro pedido nesta mesa
              </Button>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-sm w-full">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Pague com PIX</h1>
            <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
              <p className="text-2xl font-black text-primary">
                R$ {orderTotal.toFixed(2).replace(".", ",")}
              </p>
              <div className="flex justify-center">
                <QRCodeSVG value={pixPayload} size={200} />
              </div>
              <p className="text-xs text-muted-foreground">
                Aponte a câmera do app do seu banco para o QR Code acima
              </p>
              <Button
                variant="outline" size="sm" className="w-full"
                onClick={() => { navigator.clipboard.writeText(pixPayload); toast.success("Código PIX copiado!"); }}
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copiar código Pix
              </Button>
            </div>
            <Button variant="ghost" onClick={resetAll} className="w-full text-sm text-muted-foreground">
              Fazer outro pedido nesta mesa
            </Button>
          </div>
        </div>
      );
    }

    // Card chosen
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm w-full">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Pedido enviado! 🎉</h1>
          <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
            <CreditCard className="w-12 h-12 text-blue-500 mx-auto" />
            <p className="font-bold text-foreground text-lg">Pagamento no final</p>
            <p className="text-sm text-muted-foreground">
              O pagamento com cartão será realizado ao final da refeição. Bom apetite! 🍽️
            </p>
            <p className="text-2xl font-black text-primary">
              R$ {orderTotal.toFixed(2).replace(".", ",")}
            </p>
          </div>
          <Button variant="ghost" onClick={resetAll} className="w-full text-sm text-muted-foreground">
            Fazer outro pedido nesta mesa
          </Button>
        </div>
      </div>
    );
  }

  // ── People setup screen ────────────────────────────────────────────────
  if (!setupDone) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-card border-b border-border px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mr-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            {org.logo_url ? (
              <img src={org.logo_url} alt={org.name} className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <span className="text-2xl">{org.emoji}</span>
            )}
            <div>
              <h1 className="font-bold text-foreground text-base leading-tight">{org.name}</h1>
              <p className="text-muted-foreground text-sm">Mesa {tableNum}</p>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-8 space-y-6">
          <div className="text-center space-y-2">
            <Users className="w-12 h-12 text-primary mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Quem está na mesa?</h2>
            <p className="text-sm text-muted-foreground">Informe quantas pessoas e os nomes para organizar o pedido.</p>
          </div>

          {/* People counter */}
          <div className="bg-card border border-border rounded-xl p-4">
            <label className="text-sm font-medium text-foreground mb-3 block">Quantas pessoas?</label>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => handlePeopleCountChange(-1)}
                disabled={peopleCount <= 1}
                className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-40"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-3xl font-bold text-foreground w-12 text-center">{peopleCount}</span>
              <button
                onClick={() => handlePeopleCountChange(1)}
                disabled={peopleCount >= 10}
                className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Name inputs */}
          <div className="space-y-3">
            {peopleNames.map((name, index) => (
              <div key={index} className="flex items-center gap-2 bg-card border border-border rounded-xl p-3">
                <User className="w-4 h-4 text-primary flex-shrink-0" />
                <Input
                  placeholder={`Ex: ${["João", "Maria", "Pedro", "Ana", "Lucas", "Julia", "Carlos", "Beatriz", "Rafael", "Larissa"][index % 10]}`}
                  value={name}
                  onChange={(e) => handleNameChange(index, e.target.value)}
                  className="border-0 p-0 h-auto text-sm focus-visible:ring-0 shadow-none"
                />
              </div>
            ))}
          </div>

          <Button className="w-full h-12 text-base font-bold" onClick={handleStartOrder}>
            Começar pedido →
          </Button>
        </div>
      </div>
    );
  }

  // ── Main menu screen ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-40">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-card border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mr-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          {org.logo_url ? (
            <img src={org.logo_url} alt={org.name} className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <span className="text-2xl">{org.emoji}</span>
          )}
          <div>
            <h1 className="font-bold text-foreground text-base leading-tight">{org.name}</h1>
            <p className="text-muted-foreground text-sm">Mesa {tableNum}</p>
          </div>
        </div>
      </div>

      {/* Person selector chips */}
      <div className="sticky top-[73px] z-20 bg-background border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
          {peopleNames.map((name, index) => {
            const personItemCount = cartItems
              .filter(ci => ci.customer_name === name)
              .reduce((sum, ci) => sum + ci.quantity, 0);
            return (
              <button
                key={index}
                onClick={() => setActivePerson(index)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activePerson === index
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                <User className="w-3 h-3" />
                {name}
                {personItemCount > 0 && (
                  <span className={`ml-0.5 text-[10px] rounded-full min-w-4 h-4 flex items-center justify-center px-1 ${
                    activePerson === index ? "bg-white/20" : "bg-primary/15 text-primary"
                  }`}>
                    {personItemCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Menu */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
        {Object.keys(byCategory).length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-muted-foreground">Cardápio ainda não configurado.</p>
          </div>
        ) : (
          Object.entries(byCategory).map(([category, catItems]) => (
            <section key={category}>
              <h2 className="font-bold text-foreground text-base mb-3 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-primary inline-block" />
                {category}
              </h2>
              <div className="space-y-3">
                {catItems.map((item) => {
                  const qty = getQty(item.id);
                  return (
                    <div key={item.id} className="flex gap-3 bg-card rounded-xl border border-border p-3">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 text-3xl">
                          🍽️
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        <p className="text-sm font-bold text-primary mt-1">
                          R$ {item.price.toFixed(2).replace(".", ",")}
                        </p>
                      </div>
                      <div className="flex flex-col items-center justify-center gap-1 flex-shrink-0">
                        {qty > 0 ? (
                          <>
                            <button
                              onClick={() => adjust(item, -1)}
                              className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-bold w-6 text-center text-foreground">{qty}</span>
                          </>
                        ) : (
                          <div className="w-8 h-8" />
                        )}
                        <button
                          onClick={() => adjust(item, 1)}
                          className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}

        {/* Cart summary grouped by person */}
        {totalItems > 0 && Object.keys(cartByPerson).length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              Resumo do pedido
            </h3>
            {Object.entries(cartByPerson).map(([person, personItems]) => (
              <div key={person} className="space-y-1">
                <p className="text-xs font-bold text-primary flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {person}
                </p>
                {personItems.map((ci) => (
                  <p key={ci.menu_item_id + ci.customer_name} className="text-xs text-muted-foreground ml-5">
                    {ci.quantity}× {ci.name} — R$ {(ci.price * ci.quantity).toFixed(2).replace(".", ",")}
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Notes + Coupon */}
        {Object.keys(byCategory).length > 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Observações (opcional)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Sem cebola no burger, alergia a amendoim…"
                rows={3}
              />
            </div>

            {/* Coupon field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-primary" />
                Cupom de desconto
              </label>
              {appliedCoupon ? (
                <div className="flex items-center gap-2 bg-green-50 border border-green-300 rounded-lg px-3 py-2">
                  <span className="flex-1 text-sm font-mono font-bold text-green-800">
                    {appliedCoupon.code}
                  </span>
                  <span className="text-xs text-green-700 font-medium">
                    {appliedCoupon.type === "percent"
                      ? `-${appliedCoupon.value}%`
                      : `-R$ ${appliedCoupon.value.toFixed(2).replace(".", ",")}`}
                  </span>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-green-700 hover:text-green-900 ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite o código"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                    className="font-mono uppercase"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="flex-shrink-0"
                  >
                    {couponLoading ? "…" : "Aplicar"}
                  </Button>
                </div>
              )}
              {couponError && (
                <p className="text-xs text-destructive">{couponError}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sticky cart bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border z-40">
          <div className="max-w-lg mx-auto space-y-2">
            {appliedCoupon && discount > 0 && (
              <div className="flex items-center justify-between text-sm px-1">
                <span className="text-muted-foreground">
                  Subtotal: R$ {subtotal.toFixed(2).replace(".", ",")}
                </span>
                <span className="text-green-700 font-medium">
                  Desconto: -R$ {discount.toFixed(2).replace(".", ",")}
                </span>
              </div>
            )}
            <Button
              className="w-full h-14 text-base font-bold"
              onClick={handleFinish}
              disabled={placeOrder.isPending}
            >
              {placeOrder.isPending ? (
                "Enviando pedido…"
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {totalItems} {totalItems === 1 ? "item" : "itens"} — R$ {totalPrice.toFixed(2).replace(".", ",")}
                  <span className="ml-auto opacity-80">Finalizar Pedido →</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
