import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMenuItems } from "@/hooks/useMenuItems";
import { useEditOrderItems, Order, EditOrderItem } from "@/hooks/useOrders";
import { Search, Plus, Minus, Trash2, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EditOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  orgId: string;
}

export default function EditOrderDialog({ open, onOpenChange, order, orgId }: EditOrderDialogProps) {
  const { data: menuItems = [] } = useMenuItems(orgId);
  const editMutation = useEditOrderItems(orgId);

  const [items, setItems] = useState<EditOrderItem[]>(() =>
    (order.order_items ?? []).map((i) => ({
      menu_item_id: i.menu_item_id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      customer_name: i.customer_name,
    }))
  );

  const [search, setSearch] = useState("");

  const filteredMenu = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return menuItems
      .filter((m) => m.available && m.name.toLowerCase().includes(q))
      .slice(0, 10);
  }, [search, menuItems]);

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const updateQty = (idx: number, delta: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: Math.max(1, next[idx].quantity + delta) };
      return next;
    });
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const addFromMenu = (menuItem: { id: string; name: string; price: number }) => {
    const existing = items.findIndex((i) => i.menu_item_id === menuItem.id);
    if (existing >= 0) {
      updateQty(existing, 1);
    } else {
      setItems((prev) => [
        ...prev,
        { menu_item_id: menuItem.id, name: menuItem.name, price: menuItem.price, quantity: 1 },
      ]);
    }
    setSearch("");
  };

  const handleSave = () => {
    if (items.length === 0) return;
    editMutation.mutate(
      { orderId: order.id, items },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Editar Pedido #{(order as any).order_number || order.id.slice(0, 6)}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-3">
          {/* Current items */}
          <ScrollArea className="max-h-[40vh] border rounded-lg p-3">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum item no pedido</p>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        R$ {item.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQty(idx, -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQty(idx, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeItem(idx)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Add items */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar item do cardápio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {filteredMenu.length > 0 && (
            <div className="border rounded-lg max-h-[25vh] overflow-y-auto">
              {filteredMenu.map((m) => (
                <button
                  key={m.id}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent text-left text-sm transition-colors"
                  onClick={() => addFromMenu(m)}
                >
                  <span className="truncate">{m.name}</span>
                  <span className="flex items-center gap-2 text-muted-foreground flex-shrink-0">
                    R$ {m.price.toFixed(2)}
                    <Plus className="w-4 h-4 text-primary" />
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between px-1 pt-1 border-t">
            <span className="font-semibold text-sm">Total:</span>
            <span className="font-bold text-lg">R$ {total.toFixed(2)}</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={items.length === 0 || editMutation.isPending}
            className="gap-1.5"
          >
            {editMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
