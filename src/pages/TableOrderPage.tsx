import { useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useOrganization } from "@/hooks/useOrganization";
import { useMenuItems } from "@/hooks/useMenuItems";
import { usePlaceOrder } from "@/hooks/useOrders";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Minus, Plus, ShoppingCart, CheckCircle, ArrowLeft } from "lucide-react";

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
  // Add uncategorized
  const knownCats = new Set(CATEGORY_ORDER);
  available.forEach((i) => {
    if (!knownCats.has(i.category)) {
      byCategory[i.category] = byCategory[i.category] || [];
      byCategory[i.category].push(i);
    }
  });

  const cartItems = Object.values(cart);
  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

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

  const handleFinish = async () => {
    if (!org || cartItems.length === 0) return;
    await placeOrder.mutateAsync({
      organizationId: org.id,
      tableNumber: tableNum,
      notes,
      items: cartItems,
    });
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
            onClick={() => { setCart({}); setNotes(""); setSuccess(false); }}
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

        {/* Notes */}
        {Object.keys(byCategory).length > 0 && (
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
        )}
      </div>

      {/* Sticky cart bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border z-40">
          <div className="max-w-lg mx-auto">
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
