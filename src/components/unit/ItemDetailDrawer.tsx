import { useState, useEffect } from "react";
import { Plus, Minus, UtensilsCrossed } from "lucide-react";
import {
  Drawer, DrawerContent,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useMenuItemAddons } from "@/hooks/useMenuItemAddons";
import { useGlobalAddons } from "@/hooks/useGlobalAddons";
import { useGlobalAddonExclusions } from "@/hooks/useGlobalAddonExclusions";
import type { MenuItem } from "@/hooks/useMenuItems";

type CartItemAddon = { id: string; name: string; price: number; qty: number };

interface ItemDetailDrawerProps {
  item: MenuItem | null;
  onClose: () => void;
  onAdd: (item: { id: string; name: string; price: number }, addons: CartItemAddon[], notes: string, qty: number) => void;
  primaryColor: string;
  isClosed: boolean;
  opensAt: string | null;
  organizationId?: string;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const ItemDetailDrawer = ({ item, onClose, onAdd, primaryColor, isClosed, opensAt, organizationId }: ItemDetailDrawerProps) => {
  const [selectedAddons, setSelectedAddons] = useState<CartItemAddon[]>([]);
  const [itemNotes, setItemNotes] = useState("");
  const [qty, setQty] = useState(1);

  const { data: itemAddons = [], isLoading: itemAddonsLoading } = useMenuItemAddons(item?.id);
  const { data: globalAddons = [], isLoading: globalAddonsLoading } = useGlobalAddons(organizationId);
  const { data: exclusions = [], isLoading: exclusionsLoading } = useGlobalAddonExclusions(item?.id);

  const addonsLoading = itemAddonsLoading || globalAddonsLoading || exclusionsLoading;

  // Filter out excluded global addons (or all if hide_global_addons is set)
  const hideAllGlobals = !!(item as any)?.hide_global_addons;
  const excludedIds = new Set(exclusions.map((e) => e.global_addon_id));
  const filteredGlobals = hideAllGlobals ? [] : globalAddons.filter((a) => !excludedIds.has(a.id));
  const seenNames = new Set<string>();
  const addons = [
    ...filteredGlobals.map((a) => { seenNames.add(a.name.toLowerCase()); return a; }),
    ...itemAddons.filter((a) => !seenNames.has(a.name.toLowerCase())),
  ];

  // Reset state when item changes
  useEffect(() => {
    if (item) {
      setSelectedAddons([]);
      setItemNotes("");
      setQty(1);
    }
  }, [item?.id]);

  if (!item) return null;

  const incrementAddon = (addon: { id: string; name: string; price_cents: number }) => {
    setSelectedAddons((prev) => {
      const exists = prev.find((a) => a.id === addon.id);
      if (exists) return prev.map((a) => a.id === addon.id ? { ...a, qty: a.qty + 1 } : a);
      return [...prev, { id: addon.id, name: addon.name, price: addon.price_cents / 100, qty: 1 }];
    });
  };

  const decrementAddon = (addonId: string) => {
    setSelectedAddons((prev) => {
      const exists = prev.find((a) => a.id === addonId);
      if (!exists) return prev;
      if (exists.qty <= 1) return prev.filter((a) => a.id !== addonId);
      return prev.map((a) => a.id === addonId ? { ...a, qty: a.qty - 1 } : a);
    });
  };

  const addonsTotal = selectedAddons.reduce((s, a) => s + a.price * a.qty, 0);
  const unitPrice = item.price + addonsTotal;
  const totalPrice = unitPrice * qty;

  return (
    <Drawer open={item !== null} onClose={onClose}>
      <DrawerContent className="max-h-[90vh]">
        {/* Foto */}
        <div className="w-full aspect-video bg-gradient-to-br from-amber-50 to-orange-100 overflow-hidden">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <UtensilsCrossed className="w-12 h-12 text-orange-300" />
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[50vh]">
          <div>
            <h2 className="text-lg font-bold text-foreground leading-snug">{item.name}</h2>
            {item.description && (
              <p className="text-sm text-muted-foreground leading-relaxed mt-1">{item.description}</p>
            )}
            <p className="text-xl font-bold mt-1" style={{ color: primaryColor }}>
              {fmt(item.price)}
            </p>
          </div>

          {/* Adicionais */}
          {addonsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : addons.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Adicionais</h3>
              <div className="space-y-1.5">
                {addons.map((addon) => {
                  const selected = selectedAddons.find((a) => a.id === addon.id);
                  const addonQty = selected?.qty ?? 0;
                  return (
                    <div
                      key={addon.id}
                      className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                        addonQty > 0 ? "border-primary/50 bg-primary/5" : "border-border"
                      }`}
                    >
                      <span className="text-sm text-foreground flex-1">{addon.name}</span>
                      <div className="flex items-center gap-2">
                        {addonQty > 0 ? (
                          <>
                            <button
                              type="button"
                              onClick={() => decrementAddon(addon.id)}
                              className="w-6 h-6 rounded-full bg-background shadow flex items-center justify-center hover:bg-muted transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-5 text-center text-sm font-bold">{addonQty}</span>
                          </>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => incrementAddon(addon)}
                          className="w-6 h-6 rounded-full text-white shadow flex items-center justify-center transition-colors"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-medium min-w-[60px] text-right" style={{ color: primaryColor }}>
                          + {fmt(addonQty > 0 ? (addon.price_cents / 100) * addonQty : addon.price_cents / 100)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Observações */}
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-foreground">Observações</h3>
            <Textarea
              placeholder="Ex: Sem cebola, ponto da carne..."
              value={itemNotes}
              onChange={(e) => setItemNotes(e.target.value)}
              maxLength={200}
              rows={2}
              className="resize-none text-sm"
            />
          </div>
        </div>

        {/* Ação */}
        <div className="px-5 pb-6 pt-3 border-t border-border">
          {isClosed ? (
            <div className="bg-muted rounded-xl p-4 text-center">
              <p className="font-semibold text-foreground text-sm">🔒 Loja fechada · pedidos indisponíveis</p>
              {opensAt && <p className="text-muted-foreground text-xs mt-1">Abre às {opensAt}</p>}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {/* Qty selector */}
              <div className="flex items-center gap-3 bg-secondary rounded-xl px-3 py-2">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-7 h-7 rounded-full bg-background shadow flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-6 text-center font-bold text-base">{qty}</span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="w-7 h-7 rounded-full text-white shadow flex items-center justify-center transition-colors"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Add button */}
              <button
                onClick={() => onAdd(item, selectedAddons, itemNotes, qty)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: primaryColor }}
              >
                Adicionar {fmt(totalPrice)}
              </button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ItemDetailDrawer;
