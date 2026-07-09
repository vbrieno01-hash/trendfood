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
import { formatOpensAt, type StoreStatus } from "@/lib/storeStatus";

type CartItemAddon = { id: string; name: string; price: number; qty: number };

interface ItemDetailDrawerProps {
  item: MenuItem | null;
  onClose: () => void;
  onAdd: (item: { id: string; name: string; price: number }, addons: CartItemAddon[], notes: string, qty: number) => void;
  primaryColor: string;
  /** Cor para preços e textos de destaque. Default: primaryColor (retro-compat). */
  accentColor?: string;
  /** Cor de TODOS os botões/ações (+, Adicionar). Default: primaryColor (retro-compat). */
  buttonColor?: string;
  /** Cor das pílulas/balões (badge "selecionado", destaques). Default: buttonColor. */
  categoryColor?: string;
  isClosed: boolean;
  opensAt: string | null;
  closedReason?: string;
  /** Status completo da loja para gerar mensagem detalhada (hoje/amanhã/dia). */
  storeStatus?: StoreStatus;
  organizationId?: string;
  /** Loja: padr\u00e3o "escolha única" ligado para TODOS os adicionais sem override. */
  singleChoiceAddonsDefault?: boolean;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const ItemDetailDrawer = ({ item, onClose, onAdd, primaryColor, accentColor, buttonColor, categoryColor, isClosed, opensAt, closedReason, storeStatus, organizationId, singleChoiceAddonsDefault = false }: ItemDetailDrawerProps) => {
  // Respeita o tema da loja (paleta automática extraída da logo ou cores manuais).
  const priceColor = accentColor || primaryColor || "#f97316";
  const btnColor = buttonColor || primaryColor || "#f97316";
  const catColor = categoryColor || buttonColor || primaryColor || "#f97316";
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

  // Escolha \u00fanica: por adicional (override) ou padr\u00e3o da loja
  const isSingleChoice = (a: any): boolean => {
    if (a && typeof a.single_choice === "boolean") return a.single_choice;
    return !!singleChoiceAddonsDefault;
  };
  const singleChoiceIds = new Set(addons.filter(isSingleChoice).map((a) => a.id));

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
    // Se for de escolha única: substitui qualquer outro single-choice j\u00e1 selecionado
    if (singleChoiceIds.has(addon.id)) {
      setSelectedAddons((prev) => {
        const withoutOtherSingles = prev.filter((a) => !singleChoiceIds.has(a.id) || a.id === addon.id);
        const already = withoutOtherSingles.find((a) => a.id === addon.id);
        if (already) return withoutOtherSingles; // j\u00e1 selecionado, mant\u00e9m qty=1
        return [...withoutOtherSingles, { id: addon.id, name: addon.name, price: addon.price_cents / 100, qty: 1 }];
      });
      return;
    }
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
      <DrawerContent className="max-h-[92vh] flex flex-col">
        {/* Foto */}
        <div className="w-full aspect-video max-h-[38vh] bg-gradient-to-br from-amber-50 to-orange-100 overflow-hidden shrink-0">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <UtensilsCrossed className="w-12 h-12 text-orange-300" />
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="p-5 max-[380px]:p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div>
            <h2 className="text-lg font-bold text-foreground leading-snug">{item.name}</h2>
            {item.description && (
              <p className="text-sm text-muted-foreground leading-relaxed mt-1">{item.description}</p>
            )}
            <p className="text-xl font-bold mt-1" style={{ color: priceColor }}>
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
                  const single = singleChoiceIds.has(addon.id);
                  return (
                    <div
                      key={addon.id}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-colors"
                      style={
                        addonQty > 0
                          ? { borderColor: `${catColor}80`, backgroundColor: `${catColor}10` }
                          : { borderColor: "var(--border)" }
                      }
                    >
                      <span className="text-sm text-foreground flex-1">
                        {addon.name}
                        {single && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                            escolha única
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        {addonQty > 0 && !single ? (
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
                        {single ? (
                          <button
                            type="button"
                            onClick={() =>
                              addonQty > 0
                                ? decrementAddon(addon.id)
                                : incrementAddon(addon)
                            }
                            className="min-w-[70px] h-7 px-3 rounded-full text-xs font-semibold shadow flex items-center justify-center transition-colors border"
                            style={
                              addonQty > 0
                                ? { backgroundColor: btnColor, color: "#fff", borderColor: btnColor }
                                : { backgroundColor: "transparent", color: btnColor, borderColor: btnColor }
                            }
                          >
                            {addonQty > 0 ? "Selecionado" : "Escolher"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => incrementAddon(addon)}
                            className="w-6 h-6 rounded-full text-white shadow flex items-center justify-center transition-colors"
                            style={{ backgroundColor: btnColor }}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                        <span className="text-sm font-medium min-w-[60px] text-right" style={{ color: priceColor }}>
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
              onChange={(e) => { if (!e?.target) return; setItemNotes(e.target.value); }}
              maxLength={200}
              rows={2}
              className="resize-none text-sm"
            />
          </div>
        </div>

        {/* Ação */}
        <div
          className="px-5 max-[380px]:px-4 pt-3 border-t border-border shrink-0 bg-background"
          style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
        >
          {isClosed ? (
            <div className="bg-muted rounded-xl p-4 text-center">
              <p className="font-semibold text-foreground text-sm">
                {closedReason === "break"
                  ? `⏸ Em pausa · voltamos às ${opensAt || "breve"}`
                  : "🔒 Loja fechada · pedidos indisponíveis"}
              </p>
              {opensAt && (
                <p className="text-muted-foreground text-xs mt-1">
                  Abre {(storeStatus && formatOpensAt(storeStatus)) || `às ${opensAt}`}
                </p>
              )}
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
                  style={{ backgroundColor: btnColor }}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Add button */}
              <button
                onClick={() => onAdd(item, selectedAddons, itemNotes, qty)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: btnColor }}
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
