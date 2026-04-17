import { useState, useMemo } from "react";
import { useMenuItems, buildCategoryOrder, MenuItem } from "@/hooks/useMenuItems";
import { usePlaceOrder } from "@/hooks/useOrders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Minus, Trash2, ShoppingCart, Banknote, CreditCard, QrCode, Clock, Send } from "lucide-react";

interface CartItem {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CounterTabProps {
  orgId: string;
  pausedCategories?: string[];
}

const CounterTab = ({ orgId, pausedCategories = [] }: CounterTabProps) => {
  const { data: items = [], isLoading } = useMenuItems(orgId);
  const placeOrder = usePlaceOrder();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card_debit" | "card_credit" | "pix" | "pending" | null>(null);
  const [search, setSearch] = useState("");

  const DAY_KEYS = ["dom","seg","ter","qua","qui","sex","sab"];
  const getNowInBrasiliaDay = () => {
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
    const brt = new Date(utcMs + (-3) * 3600_000);
    return brt.getDay();
  };
  const currentDayKey = DAY_KEYS[getNowInBrasiliaDay()];

  const availableItems = useMemo(() => items.filter((i) => {
    if (!i.available) return false;
    if (pausedCategories.includes(i.category)) return false;
    const days = i.available_days as string[] | null;
    if (days && Array.isArray(days) && days.length > 0 && !days.includes(currentDayKey)) return false;
    return true;
  }), [items, pausedCategories, currentDayKey]);

  const categoryOrder = useMemo(
    () => buildCategoryOrder(availableItems),
    [availableItems]
  );

  const filteredItems = useMemo(() => {
    if (!search.trim()) return availableItems;
    const q = search.toLowerCase();
    return availableItems.filter(
      (i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
    );
  }, [availableItems, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of filteredItems) {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    }
    return categoryOrder.filter((c) => map.has(c)).map((c) => ({ category: c, items: map.get(c)! }));
  }, [filteredItems, categoryOrder]);

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menu_item_id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const updateQty = (menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.menu_item_id === menuItemId ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => prev.filter((c) => c.menu_item_id !== menuItemId));
  };

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error("Adicione itens ao pedido");
      return;
    }
    if (!paymentMethod) {
      toast.error("Selecione o método de pagamento");
      return;
    }

    try {
      await placeOrder.mutateAsync({
        organizationId: orgId,
        tableNumber: -1,
        notes: notes.trim(),
        items: cart,
        initialStatus: "pending",
        paymentMethod,
        paid: paymentMethod !== "pending" && paymentMethod !== "pix",
      });
      toast.success("Pedido enviado para a cozinha! 🎉");
      setCart([]);
      setNotes("");
      setPaymentMethod(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar pedido");
    }
  };

  // Sem emoji parasita: o título da categoria aparece só com o nome.
  const getEmoji = (_category: string) => "";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">🛒 Balcão</h2>
        <p className="text-sm text-muted-foreground">Registre pedidos de clientes no balcão</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Menu */}
        <div className="lg:col-span-2 space-y-4">
          <Input
            placeholder="Buscar item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />

          {grouped.length === 0 && (
            <p className="text-muted-foreground text-sm py-8 text-center">Nenhum item disponível no cardápio.</p>
          )}

          {grouped.map(({ category, items: catItems }) => (
            <div key={category}>
              <h3 className="font-semibold text-sm mb-2">
                {category}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {catItems.map((item) => {
                  const inCart = cart.find((c) => c.menu_item_id === item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors text-left relative"
                    >
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-cover shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-primary font-semibold">
                          R$ {item.price.toFixed(2).replace(".", ",")}
                        </p>
                      </div>
                      {inCart && (
                        <Badge className="absolute -top-1.5 -right-1.5 h-5 min-w-5 flex items-center justify-center text-[10px] p-0">
                          {inCart.quantity}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Cart */}
        <div className="space-y-3">
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Carrinho ({cart.length})
              </h3>

              {cart.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Toque nos itens para adicionar
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {cart.map((c) => (
                    <div key={c.menu_item_id} className="flex items-center gap-2 text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium text-xs">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          R$ {(c.price * c.quantity).toFixed(2).replace(".", ",")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-6 w-6"
                          onClick={() => updateQty(c.menu_item_id, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-xs font-bold w-5 text-center">{c.quantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-6 w-6"
                          onClick={() => updateQty(c.menu_item_id, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
                          onClick={() => removeFromCart(c.menu_item_id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-2">
                <div className="flex justify-between font-bold text-sm">
                  <span>Total</span>
                  <span className="text-primary">R$ {cartTotal.toFixed(2).replace(".", ",")}</span>
                </div>
              </div>

              <Textarea
                placeholder="Observações (opcional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs min-h-[60px]"
              />

              {/* Payment method */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Pagamento</p>
                <div className="grid grid-cols-5 gap-2">
                  {([
                    { key: "cash" as const, label: "Dinheiro", icon: Banknote },
                    { key: "card_debit" as const, label: "Débito", icon: CreditCard },
                    { key: "card_credit" as const, label: "Crédito", icon: CreditCard },
                    { key: "pix" as const, label: "PIX", icon: QrCode },
                    { key: "pending" as const, label: "Pendente", icon: Clock },
                  ]).map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setPaymentMethod(key)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-colors ${
                        paymentMethod === key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-accent/50"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                className="w-full gap-2"
                disabled={cart.length === 0 || !paymentMethod || placeOrder.isPending}
                onClick={handleSubmit}
              >
                <Send className="w-4 h-4" />
                {placeOrder.isPending ? "Enviando..." : "Enviar Pedido"}
              </Button>

              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  onClick={() => { setCart([]); setPaymentMethod(null); setNotes(""); }}
                >
                  Limpar tudo
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CounterTab;
