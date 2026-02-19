import { useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useOrganization } from "@/hooks/useOrganization";
import { useMenuItems } from "@/hooks/useMenuItems";
import { usePlaceOrder } from "@/hooks/useOrders";
import { validateCoupon, incrementCouponUses } from "@/hooks/useCoupons";
import type { Coupon } from "@/hooks/useCoupons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Minus, Plus, ShoppingCart, CheckCircle, ArrowLeft, Tag, X } from "lucide-react";

interface CartItem {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
}

const CATEGORY_ORDER = [
  "Hambúrgueres", "Bebidas", "Porções", "Sobremesas", "Combos", "Outros",
];

export default function TableOrderPage() {
  const { slug, tableNumber } = useParams<{ slug: string; tableNumber: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const fromDashboard = location.state?.from === "dashboard";

  const { data: org, isLoading: orgLoading } = useOrganization(slug);
  const { data: items = [], isLoading: itemsLoading } = useMenuItems(org?.id);
  const placeOrder = usePlaceOrder();

  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [notes, setNotes] = useState("");
  const [success, setSuccess] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

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

  const adjust = (item: typeof available[0], delta: number) => {
    setCart((prev) => {
      const existing = prev[item.id];
      const newQty = (existing?.quantity ?? 0) + delta;
      if (newQty <= 0) {
        const { [item.id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [item.id]: { menu_item_id: item.id, name: item.name, price: item.price, quantity: newQty } };
    });
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

    let finalNotes = notes;
    if (appliedCoupon) {
      finalNotes = finalNotes
        ? `${finalNotes} | CUPOM:${appliedCoupon.code}`
        : `CUPOM:${appliedCoupon.code}`;
    }

    await placeOrder.mutateAsync({
      organizationId: org.id,
      tableNumber: tableNum,
      notes: finalNotes,
      items: cartItems,
    });

    // Increment coupon uses after successful order
    if (appliedCoupon) {
      await incrementCouponUses(appliedCoupon.id);
    }

    setSuccess(true);
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

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Pedido enviado! 🎉</h1>
          <p className="text-muted-foreground">
            Seu pedido para a <strong>Mesa {tableNum}</strong> foi recebido. Em breve a cozinha irá preparar!
          </p>
          <Button
            onClick={() => navigate("/dashboard", { state: { tab: "tables" } })}
            className="w-full"
          >
            ← Voltar às Mesas
          </Button>
          <Button
            variant="ghost"
            onClick={() => { setCart({}); setNotes(""); setSuccess(false); setAppliedCoupon(null); setCouponCode(""); }}
            className="w-full text-sm text-muted-foreground"
          >
            Fazer outro pedido nesta mesa
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-40">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-card border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => fromDashboard ? navigate("/dashboard") : navigate(-1)}
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
                  const qty = cart[item.id]?.quantity ?? 0;
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
            {/* Discount summary */}
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
