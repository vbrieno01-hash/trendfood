import { useState, useRef, useEffect, useCallback } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Pencil, Trash2, Camera, Loader2, UtensilsCrossed, Copy, ArrowUpDown, Package, Lock, Upload, Download, ChevronUp, ChevronDown, Pause, Play,
} from "lucide-react";
import ImportMenuDialog from "@/components/dashboard/ImportMenuDialog";
import {
  useStockItems, useMenuItemIngredients, useAddMenuItemIngredient, useRemoveMenuItemIngredient,
  type StockItem,
} from "@/hooks/useStockItems";
import {
  useMenuItems, useAddMenuItem, useUpdateMenuItem, useDeleteMenuItem, useDeleteAllMenuItems,
  uploadMenuImage, CATEGORIES, CATEGORY_EMOJI_PALETTE, MenuItem, MenuItemInput, SortOrder, buildCategoryOrder,
} from "@/hooks/useMenuItems";
import { supabase } from "@/integrations/supabase/client";
import {
  useAllMenuItemAddons, useAddMenuItemAddon, useUpdateMenuItemAddon, useDeleteMenuItemAddon,
  
} from "@/hooks/useMenuItemAddonsCrud";
import { useAllGlobalAddons } from "@/hooks/useGlobalAddonsCrud";
import { useGlobalAddonExclusions, useAddExclusion, useRemoveExclusion } from "@/hooks/useGlobalAddonExclusions";
import GlobalAddonsSection from "@/components/dashboard/GlobalAddonsSection";
import FirstAccessBanner from "@/components/dashboard/FirstAccessBanner";

interface Organization {
  id: string;
  name: string;
  slug: string;
  category_order?: string[] | null;
  paused_categories?: string[] | null;
  category_emojis?: Record<string, string> | null;
}

const EMPTY_FORM: MenuItemInput = {
  name: "",
  description: "",
  price: 0,
  category: "Lanches com 1 hambúrguer e sem batata frita",
  available: true,
  imageFile: null,
  image_url: null,
  available_days: null,
};

const SORT_KEY = "menu_sort_order";

/* ─── Draft persistence helpers ─── */
interface DraftState {
  modalOpen: boolean;
  editItemId: string | null;
  form: Omit<MenuItemInput, "imageFile">;
  imagePreview: string | null;
  ts: number;
}

function draftKey(orgId: string) {
  return `menu_draft_v3:${orgId}`;
}

function saveDraft(orgId: string, draft: DraftState) {
  try {
    localStorage.setItem(draftKey(orgId), JSON.stringify(draft));
    console.log("[MenuTab] Draft saved (localStorage)", { modalOpen: draft.modalOpen, editItemId: draft.editItemId });
  } catch { /* quota exceeded — ignore */ }
}

function loadDraft(orgId: string): DraftState | null {
  try {
    const raw = localStorage.getItem(draftKey(orgId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as DraftState;
    // discard stale drafts (>30 min)
    if (Date.now() - draft.ts > 30 * 60 * 1000) {
      localStorage.removeItem(draftKey(orgId));
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

function clearDraft(orgId: string) {
  localStorage.removeItem(draftKey(orgId));
  console.log("[MenuTab] Draft cleared (localStorage)");
}

/* ─── Ingredients sub-component (edit mode — persists to DB) ─── */
function IngredientsSection({
  menuItemId,
  stockItems,
  addIngredient,
  removeIngredient,
  onCostChange,
}: {
  menuItemId: string;
  stockItems: StockItem[];
  addIngredient: ReturnType<typeof useAddMenuItemIngredient>;
  removeIngredient: ReturnType<typeof useRemoveMenuItemIngredient>;
  onCostChange?: (cost: number) => void;
}) {
  const { data: ingredients = [], isLoading } = useMenuItemIngredients(menuItemId);
  const [selectedStockId, setSelectedStockId] = useState("");
  const [qtyUsed, setQtyUsed] = useState(1);

  const linkedIds = new Set(ingredients.map((i) => i.stock_item_id));
  const available = stockItems.filter((s) => !linkedIds.has(s.id));

  const totalCost = ingredients.reduce(
    (sum, ing) => sum + (Number(ing.stock_item?.cost_per_unit ?? 0) * Number(ing.quantity_used ?? 0)),
    0,
  );

  useEffect(() => {
    onCostChange?.(totalCost);
  }, [totalCost, onCostChange]);

  const handleAdd = () => {
    if (!selectedStockId || qtyUsed <= 0) return;
    addIngredient.mutate(
      { menu_item_id: menuItemId, stock_item_id: selectedStockId, quantity_used: qtyUsed },
      { onSuccess: () => { setSelectedStockId(""); setQtyUsed(1); } },
    );
  };

  return (
    <div className="border border-border rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Package className="w-4 h-4 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Composição do Produto</p>
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">Carregando…</p>}

      {/* Linked list */}
      {ingredients.length > 0 && (
        <div className="space-y-1">
          {ingredients.map((ing) => (
            <div key={ing.id} className="flex items-center justify-between text-sm bg-secondary/50 rounded px-2.5 py-1.5">
              <span className="text-foreground">
                {ing.stock_item?.name ?? "?"} — <span className="text-muted-foreground">{ing.quantity_used} {ing.stock_item?.unit ?? "un"}/venda</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="w-6 h-6 text-muted-foreground hover:text-destructive"
                onClick={() => removeIngredient.mutate({ id: ing.id, menuItemId })}
                disabled={removeIngredient.isPending}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {totalCost > 0 && (
        <p className="text-xs text-muted-foreground">
          Custo total dos insumos: <span className="font-medium text-foreground">R$ {totalCost.toFixed(2).replace(".", ",")}</span> · sugerido como preço mínimo
        </p>
      )}

      {/* Add new */}
      {stockItems.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum insumo cadastrado. Crie na aba Estoque primeiro.</p>
      ) : available.length === 0 && ingredients.length > 0 ? (
        <p className="text-xs text-muted-foreground">Todos os insumos já estão vinculados.</p>
      ) : (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label className="text-xs">Insumo</Label>
            <select
              value={selectedStockId}
              onChange={(e) => setSelectedStockId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecione…</option>
              {available.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.unit})</option>
              ))}
            </select>
          </div>
          <div className="w-20">
            <Label className="text-xs">Qtd/venda</Label>
            <Input
              type="number"
              min={0.01}
              step="any"
              value={qtyUsed}
              onChange={(e) => setQtyUsed(Number(e.target.value))}
              className="h-9"
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="h-9 gap-1"
            onClick={handleAdd}
            disabled={!selectedStockId || qtyUsed <= 0 || addIngredient.isPending}
          >
            <Plus className="w-3.5 h-3.5" />
            Vincular
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Pending Ingredients (create mode — local state only) ─── */
interface PendingIngredient {
  stock_item_id: string;
  quantity_used: number;
}

function PendingIngredientsSection({
  stockItems,
  pending,
  onChange,
  onCostChange,
}: {
  stockItems: StockItem[];
  pending: PendingIngredient[];
  onChange: (next: PendingIngredient[]) => void;
  onCostChange?: (cost: number) => void;
}) {
  const [selectedStockId, setSelectedStockId] = useState("");
  const [qtyUsed, setQtyUsed] = useState(1);

  const linkedIds = new Set(pending.map((p) => p.stock_item_id));
  const available = stockItems.filter((s) => !linkedIds.has(s.id));

  const totalCost = pending.reduce((sum, p) => {
    const si = stockItems.find((s) => s.id === p.stock_item_id);
    return sum + (Number(si?.cost_per_unit ?? 0) * Number(p.quantity_used ?? 0));
  }, 0);

  useEffect(() => {
    onCostChange?.(totalCost);
  }, [totalCost, onCostChange]);

  const handleAdd = () => {
    if (!selectedStockId || qtyUsed <= 0) return;
    onChange([...pending, { stock_item_id: selectedStockId, quantity_used: qtyUsed }]);
    setSelectedStockId("");
    setQtyUsed(1);
  };

  const handleRemove = (idx: number) => {
    onChange(pending.filter((_, i) => i !== idx));
  };

  return (
    <div className="border border-border rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Package className="w-4 h-4 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Composição do Produto</p>
      </div>

      {pending.length > 0 && (
        <div className="space-y-1">
          {pending.map((p, idx) => {
            const si = stockItems.find((s) => s.id === p.stock_item_id);
            return (
              <div key={idx} className="flex items-center justify-between text-sm bg-secondary/50 rounded px-2.5 py-1.5">
                <span className="text-foreground">
                  {si?.name ?? "?"} — <span className="text-muted-foreground">{p.quantity_used} {si?.unit ?? "un"}/venda</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(idx)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {totalCost > 0 && (
        <p className="text-xs text-muted-foreground">
          Custo total dos insumos: <span className="font-medium text-foreground">R$ {totalCost.toFixed(2).replace(".", ",")}</span> · sugerido como preço mínimo
        </p>
      )}

      {stockItems.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum insumo cadastrado. Crie na aba Estoque primeiro.</p>
      ) : available.length === 0 && pending.length > 0 ? (
        <p className="text-xs text-muted-foreground">Todos os insumos já estão vinculados.</p>
      ) : (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label className="text-xs">Insumo</Label>
            <select
              value={selectedStockId}
              onChange={(e) => setSelectedStockId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecione…</option>
              {available.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.unit})</option>
              ))}
            </select>
          </div>
          <div className="w-20">
            <Label className="text-xs">Qtd/venda</Label>
            <Input
              type="number"
              min={0.01}
              step="any"
              value={qtyUsed}
              onChange={(e) => setQtyUsed(Number(e.target.value))}
              className="h-9"
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="h-9 gap-1"
            onClick={handleAdd}
            disabled={!selectedStockId || qtyUsed <= 0}
          >
            <Plus className="w-3.5 h-3.5" />
            Vincular
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Addons sub-component (edit mode — persists to DB) ─── */
function AddonsSection({ menuItemId, organizationId, hideGlobalAddons, onToggleHideGlobal }: { menuItemId: string; organizationId: string; hideGlobalAddons: boolean; onToggleHideGlobal: (val: boolean) => void }) {
  const { data: addons = [], isLoading } = useAllMenuItemAddons(menuItemId);
  const { data: globalAddons = [] } = useAllGlobalAddons(organizationId);
  const { data: exclusions = [] } = useGlobalAddonExclusions(menuItemId);
  const addExclusion = useAddExclusion();
  const removeExclusion = useRemoveExclusion();
  const addAddon = useAddMenuItemAddon();
  const updateAddon = useUpdateMenuItemAddon();
  const deleteAddon = useDeleteMenuItemAddon();
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState(0);

  const excludedIds = new Set(exclusions.map((e) => e.global_addon_id));
  const availableGlobals = globalAddons.filter((g) => g.available);

  const handleAdd = () => {
    if (!newName.trim()) return;
    addAddon.mutate(
      { menu_item_id: menuItemId, name: newName.trim(), price_cents: Math.round(newPrice * 100) },
      { onSuccess: () => { setNewName(""); setNewPrice(0); } },
    );
  };

  const toggleGlobalExclusion = (globalAddonId: string) => {
    if (excludedIds.has(globalAddonId)) {
      removeExclusion.mutate({ menu_item_id: menuItemId, global_addon_id: globalAddonId });
    } else {
      addExclusion.mutate({ menu_item_id: menuItemId, global_addon_id: globalAddonId });
    }
  };

  return (
    <div className="border border-border rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Plus className="w-4 h-4 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Adicionais / Complementos</p>
      </div>

      {/* Hide all global addons toggle */}
      {availableGlobals.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/50 rounded">
            <Switch
              checked={hideGlobalAddons}
              onCheckedChange={onToggleHideGlobal}
              className="scale-75"
            />
            <span className="text-sm text-foreground">Ocultar todos os adicionais fixos deste produto</span>
          </div>

          {/* Individual toggles — only show when not hiding all */}
          {!hideGlobalAddons && (
            <>
              <p className="text-xs text-muted-foreground font-medium">Adicionais fixos (globais)</p>
              {availableGlobals.map((g) => {
            const isExcluded = excludedIds.has(g.id);
            return (
              <div key={g.id} className={cn(
                "flex items-center gap-2 text-sm rounded px-2.5 py-1.5",
                isExcluded ? "bg-muted/50 opacity-60" : "bg-primary/5"
              )}>
                <Switch
                  checked={!isExcluded}
                  onCheckedChange={() => toggleGlobalExclusion(g.id)}
                  className="scale-75"
                  disabled={addExclusion.isPending || removeExclusion.isPending}
                />
                <span className={cn("flex-1 text-foreground truncate", isExcluded && "line-through")}>{g.name}</span>
                <span className="text-muted-foreground text-xs tabular-nums whitespace-nowrap">
                  +R$ {(g.price_cents / 100).toFixed(2).replace(".", ",")}
                </span>
              </div>
            );
              })}
            </>
          )}
        </div>
      )}

      {isLoading && <p className="text-xs text-muted-foreground">Carregando…</p>}

      {/* Item-specific addons */}
      {addons.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Adicionais deste produto</p>
          {addons.map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-sm bg-secondary/50 rounded px-2.5 py-1.5 flex-wrap">
              <Switch
                checked={a.available}
                onCheckedChange={(v) => updateAddon.mutate({ id: a.id, menuItemId, available: v })}
                className="scale-75"
              />
              <span className="flex-1 text-foreground truncate">{a.name}</span>
              <span className="text-muted-foreground text-xs tabular-nums whitespace-nowrap">
                +R$ {(a.price_cents / 100).toFixed(2).replace(".", ",")}
              </span>
              <label className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold cursor-pointer select-none whitespace-nowrap">
                <Switch
                  checked={a.single_choice === true}
                  onCheckedChange={(v) =>
                    updateAddon.mutate({ id: a.id, menuItemId, single_choice: v ? true : null })
                  }
                  className="scale-75"
                />
                Única
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="w-6 h-6 text-muted-foreground hover:text-destructive"
                onClick={() => deleteAddon.mutate({ id: a.id, menuItemId })}
                disabled={deleteAddon.isPending}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label className="text-xs">Nome</Label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ex: Bacon extra"
            className="h-9"
          />
        </div>
        <div className="w-28">
          <Label className="text-xs">Preço</Label>
          <CurrencyInput
            value={newPrice}
            onChange={setNewPrice}
            className="h-9"
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="h-9 gap-1"
          onClick={handleAdd}
          disabled={!newName.trim() || addAddon.isPending}
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar
        </Button>
      </div>
    </div>
  );
}

/* ─── Pending Addons (create mode — local state only) ─── */
interface PendingAddon {
  name: string;
  price_cents: number;
}

function PendingAddonsSection({
  pending,
  onChange,
  hideGlobalAddons,
  onToggleHideGlobal,
  hasGlobalAddons,
}: {
  pending: PendingAddon[];
  onChange: (next: PendingAddon[]) => void;
  hideGlobalAddons: boolean;
  onToggleHideGlobal: (val: boolean) => void;
  hasGlobalAddons: boolean;
}) {
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState(0);

  const handleAdd = () => {
    if (!newName.trim()) return;
    onChange([...pending, { name: newName.trim(), price_cents: Math.round(newPrice * 100) }]);
    setNewName("");
    setNewPrice(0);
  };

  return (
    <div className="border border-border rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Plus className="w-4 h-4 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Adicionais / Complementos</p>
      </div>

      {hasGlobalAddons && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/50 rounded">
          <Switch
            checked={hideGlobalAddons}
            onCheckedChange={onToggleHideGlobal}
            className="scale-75"
          />
          <span className="text-sm text-foreground">Ocultar todos os adicionais fixos deste produto</span>
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-1">
          {pending.map((p, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm bg-secondary/50 rounded px-2.5 py-1.5">
              <span className="text-foreground">{p.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs tabular-nums">
                  +R$ {(p.price_cents / 100).toFixed(2).replace(".", ",")}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6 text-muted-foreground hover:text-destructive"
                  onClick={() => onChange(pending.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label className="text-xs">Nome</Label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ex: Bacon extra"
            className="h-9"
          />
        </div>
        <div className="w-28">
          <Label className="text-xs">Preço</Label>
          <CurrencyInput
            value={newPrice}
            onChange={setNewPrice}
            className="h-9"
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="h-9 gap-1"
          onClick={handleAdd}
          disabled={!newName.trim()}
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar
        </Button>
      </div>
    </div>
  );
}

export default function MenuTab({ organization, menuItemLimit, canAccessAddons = true, canAccessStockIngredients = true }: { organization: Organization; menuItemLimit?: number | null; canAccessAddons?: boolean; canAccessStockIngredients?: boolean }) {
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => (localStorage.getItem(SORT_KEY) as SortOrder) || "newest");
  
  const { data: items = [], isLoading } = useMenuItems(organization.id, sortOrder);
  const addMutation = useAddMenuItem(organization.id);
  const updateMutation = useUpdateMenuItem(organization.id);
  const deleteMutation = useDeleteMenuItem(organization.id);

  // Stock / ingredients hooks
  const { data: stockItems = [] } = useStockItems(organization.id);
  const addIngredient = useAddMenuItemIngredient();
  const removeIngredient = useRemoveMenuItemIngredient();

  // Rehydrate from draft on mount
  const initialDraft = useRef(loadDraft(organization.id));

  const [modalOpen, setModalOpen] = useState(() => initialDraft.current?.modalOpen ?? false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [editItemId, setEditItemId] = useState<string | null>(() => initialDraft.current?.editItemId ?? null);
  const [form, setForm] = useState<MenuItemInput>(() => {
    if (initialDraft.current?.form) {
      return { ...initialDraft.current.form, imageFile: null };
    }
    return EMPTY_FORM;
  });
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(() => initialDraft.current?.imagePreview ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingIngredients, setPendingIngredients] = useState<PendingIngredient[]>([]);
  const [pendingAddons, setPendingAddons] = useState<PendingAddon[]>([]);
  const [pendingHideGlobalAddons, setPendingHideGlobalAddons] = useState(false);
  const [priceTouched, setPriceTouched] = useState(false);

  const handleIngredientsCostChange = useCallback((cost: number) => {
    if (priceTouched) return;
    if (cost <= 0) return;
    setForm((p) => {
      const current = Number(p.price ?? 0);
      if (current > 0) return p;
      return { ...p, price: Number(cost.toFixed(2)) };
    });
  }, [priceTouched]);
  const [importOpen, setImportOpen] = useState(false);
  const [moveCatOpen, setMoveCatOpen] = useState<string | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [localCategoryOrder, setLocalCategoryOrder] = useState<string[] | null>(null);
  const [localPausedCats, setLocalPausedCats] = useState<string[]>(organization.paused_categories ?? []);
  const [localCategoryEmojis, setLocalCategoryEmojis] = useState<Record<string, string>>(
    organization.category_emojis ?? {}
  );
  const [emojiPickerOpen, setEmojiPickerOpen] = useState<string | null>(null);

  const togglePauseCategory = async (cat: string) => {
    const current = localPausedCats;
    const updated = current.includes(cat) ? current.filter(c => c !== cat) : [...current, cat];
    setLocalPausedCats(updated);
    await supabase.from("organizations").update({ paused_categories: updated } as any).eq("id", organization.id);
  };

  const setCategoryEmoji = async (cat: string, emoji: string | null) => {
    const updated = { ...localCategoryEmojis };
    if (emoji) {
      updated[cat] = emoji;
    } else {
      delete updated[cat];
    }
    setLocalCategoryEmojis(updated);
    setEmojiPickerOpen(null);
    await supabase.from("organizations").update({ category_emojis: updated } as any).eq("id", organization.id);
  };
  const { data: globalAddonsForCreate = [] } = useAllGlobalAddons(organization.id);
  const addAddonMutation = useAddMenuItemAddon();
  const deleteAllMutation = useDeleteAllMenuItems(organization.id);
  const fileRef = useRef<HTMLInputElement>(null);
  // Track object URLs for cleanup
  const objectUrlRef = useRef<string | null>(null);

  // Log mount/unmount for debugging
  useEffect(() => {
    console.log("[MenuTab] MOUNTED, draft restored:", !!initialDraft.current?.modalOpen);
    return () => {
      console.log("[MenuTab] UNMOUNTED");
      // Cleanup object URL on unmount
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  // Resolve editItem from editItemId when items load
  useEffect(() => {
    if (editItemId && items.length > 0) {
      const found = items.find(i => i.id === editItemId) ?? null;
      setEditItem(found);
    }
  }, [editItemId, items]);

  // Persist draft whenever modal state changes
  const persistDraft = useCallback(() => {
    if (modalOpen) {
      const draft: DraftState = {
        modalOpen: true,
        editItemId,
        form: { name: form.name, description: form.description, price: form.price, category: form.category, available: form.available, image_url: form.image_url, available_days: form.available_days },
        imagePreview: form.image_url || null, // only persist remote URLs, not blob URLs
        ts: Date.now(),
      };
      saveDraft(organization.id, draft);
    }
  }, [modalOpen, editItemId, form, organization.id]);

  useEffect(() => {
    persistDraft();
  }, [persistDraft]);

  // Listen for page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const draft = loadDraft(organization.id);
        if (draft?.modalOpen && !modalOpen) {
          console.log("[MenuTab] Rehydrating modal from draft on resume");
          setModalOpen(true);
          setEditItemId(draft.editItemId);
          setForm({ ...draft.form, imageFile: null });
          setImagePreview(draft.imagePreview);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [organization.id]);

  // Build category order using saved order or defaults
  const categoryOrder = buildCategoryOrder(items, localCategoryOrder ?? organization.category_order);

  const grouped = categoryOrder.map((cat) => ({
    value: cat,
    items: items.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  const moveCategoryOrder = async (index: number, direction: "up" | "down") => {
    const currentOrder = grouped.map((g) => g.value);
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= currentOrder.length) return;
    const newOrder = [...currentOrder];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    setLocalCategoryOrder(newOrder);
    await supabase.from("organizations").update({ category_order: newOrder } as any).eq("id", organization.id);
  };

  const totalItems = items.length;
  const totalCategories = grouped.length;

  const { toast } = useToast();
  const limitReached = menuItemLimit != null && items.length >= menuItemLimit;

  const openCreate = () => {
    if (limitReached) {
      toast({ title: "Limite de itens atingido", description: "Faça upgrade para adicionar mais itens ao cardápio.", variant: "destructive" });
      return;
    }
    setEditItem(null);
    setEditItemId(null);
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setPendingIngredients([]);
    setPendingAddons([]);
    setPendingHideGlobalAddons(false);
    setPriceTouched(false);
    setModalOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditItem(item);
    setEditItemId(item.id);
    setPendingIngredients([]);
    setPendingAddons([]);
    setPriceTouched(Number(item.price ?? 0) > 0);
    setForm({
      name: item.name,
      description: item.description ?? "",
      price: item.price,
      category: item.category,
      available: item.available,
      imageFile: null,
      image_url: item.image_url,
      available_days: item.available_days ?? null,
    });
    setImagePreview(item.image_url);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditItem(null);
    setEditItemId(null);
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setPendingIngredients([]);
    setPendingAddons([]);
    setPendingHideGlobalAddons(false);
    clearDraft(organization.id);
    // Cleanup object URL
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  // 100% synchronous — no network, no async, no promises
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Foto muito grande", description: "Máximo 5MB.", variant: "destructive" });
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    // Cleanup previous object URL
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    const localUrl = URL.createObjectURL(file);
    objectUrlRef.current = localUrl;
    setForm((p) => ({ ...p, imageFile: file, image_url: null }));
    setImagePreview(localUrl);
    console.log("[MenuTab] Photo selected locally (no upload yet)", { size: file.size });
    // Reset input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let finalImageUrl = form.image_url;

      // Upload photo now if user selected one
      if (form.imageFile) {
        const itemId = editItem?.id ?? editItemId ?? crypto.randomUUID();
        finalImageUrl = await uploadMenuImage(organization.id, itemId, form.imageFile);
        console.log("[MenuTab] Photo uploaded on save", { finalImageUrl });
      }

      const payload: MenuItemInput = { ...form, image_url: finalImageUrl, imageFile: null };

      if (editItem) {
        await updateMutation.mutateAsync({ id: editItem.id, input: payload });
      } else {
        const created = await addMutation.mutateAsync({ ...payload, hide_global_addons: pendingHideGlobalAddons });
        // Save pending ingredients after creation
        if (pendingIngredients.length > 0 && created?.id) {
          for (const pi of pendingIngredients) {
            addIngredient.mutate({
              menu_item_id: created.id,
              stock_item_id: pi.stock_item_id,
              quantity_used: pi.quantity_used,
            });
          }
        }
        // Save pending addons after creation
        if (pendingAddons.length > 0 && created?.id) {
          for (const pa of pendingAddons) {
            addAddonMutation.mutate({
              menu_item_id: created.id,
              name: pa.name,
              price_cents: pa.price_cents,
            });
          }
        }
      }
      closeModal();
    } catch (err) {
      console.error("[MenuTab] Submit error:", err);
      const rawMsg = (err as any)?.message ?? String(err);
      const friendly =
        typeof rawMsg === "string" && rawMsg.toLowerCase().includes("falha de conexão")
          ? rawMsg
          : /failed to fetch|network|load failed|storageunknown/i.test(String(rawMsg))
            ? "Falha de conexão ao enviar a foto. Tente novamente em uma rede melhor (Wi-Fi) ou use uma foto menor."
            : rawMsg;
      toast({ title: "Erro ao salvar item", description: friendly, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAvailable = (item: MenuItem) => {
    updateMutation.mutate({
      id: item.id,
      input: {
        name: item.name,
        description: item.description ?? "",
        price: item.price,
        category: item.category,
        available: !item.available,
        image_url: item.image_url,
      },
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate({ id: deleteTarget.id, image_url: deleteTarget.image_url });
    setDeleteTarget(null);
  };

  const isPending = addMutation.isPending || updateMutation.isPending || submitting;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

  return (
    <div className="space-y-6 max-w-3xl">
      <FirstAccessBanner
        tabKey="menu"
        title="Bem-vindo ao Cardápio! 🍔"
        description="Clique em 'Adicionar item' para criar seu primeiro produto. Adicione nome, preço, foto e categoria."
      />
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meu Cardápio</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isLoading ? "…" : `${totalItems} ${totalItems === 1 ? "item" : "itens"}${menuItemLimit != null ? ` / ${menuItemLimit}` : ""} · ${totalCategories} ${totalCategories === 1 ? "categoria" : "categorias"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-9 text-muted-foreground"
            onClick={() => {
              const next = sortOrder === "newest" ? "oldest" : "newest";
              setSortOrder(next);
              localStorage.setItem(SORT_KEY, next);
            }}
            title={sortOrder === "newest" ? "Recentes primeiro" : "Antigos primeiro"}
          >
            <ArrowUpDown className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">{sortOrder === "newest" ? "Recentes primeiro" : "Antigos primeiro"}</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Importar CSV/Excel</span>
           </Button>
           {items.length > 0 && (
             <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => {
               const header = ["Nome", "Descrição", "Preço", "Categoria", "Disponível"].join(";");
               const rows = items.map((i) => [
                 `"${(i.name || "").replace(/"/g, '""')}"`,
                 `"${(i.description || "").replace(/"/g, '""')}"`,
                 (i.price ?? 0).toFixed(2).replace(".", ","),
                 `"${i.category}"`,
                 i.available ? "Sim" : "Não",
               ].join(";"));
               const csv = "\uFEFF" + [header, ...rows].join("\n");
               const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
               const url = URL.createObjectURL(blob);
               const a = document.createElement("a");
               a.href = url;
               a.download = `cardapio-${organization.slug}.csv`;
               a.click();
               URL.revokeObjectURL(url);
             }}>
               <Download className="w-4 h-4" />
               <span className="hidden sm:inline">Exportar CSV</span>
             </Button>
           )}
           {items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteAllOpen(true)}
              title="Limpar cardápio"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Limpar</span>
            </Button>
          )}
          <Button onClick={openCreate} size="sm" className="gap-1.5 h-9" disabled={limitReached}>
            <Plus className="w-4 h-4" />
            Novo item
          </Button>
        </div>
      </div>

      {/* Global Addons */}
      {canAccessAddons && <GlobalAddonsSection organizationId={organization.id} />}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && items.length === 0 && (
        <div className="border border-dashed border-border rounded-xl p-12 text-center">
          <div className="flex justify-center mb-3">
            <div className="relative" style={{ animation: 'float 3s ease-in-out infinite' }}>
              <svg width="96" height="96" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="menuEmptyBg" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="60" cy="60" r="52" fill="url(#menuEmptyBg)" style={{ animation: 'pulse 3s ease-in-out infinite' }} />
                {/* Plate */}
                <ellipse cx="60" cy="72" rx="34" ry="8" fill="hsl(var(--muted-foreground))" fillOpacity="0.08" />
                <ellipse cx="60" cy="62" rx="30" ry="30" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeOpacity="0.25" fill="none" />
                <ellipse cx="60" cy="62" rx="22" ry="22" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" strokeOpacity="0.15" fill="none" />
                {/* Fork - left */}
                <g transform="translate(38, 30) rotate(-15, 10, 30)" stroke="hsl(var(--muted-foreground))" strokeOpacity="0.45" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="10" y1="18" x2="10" y2="58" />
                  <line x1="4" y1="18" x2="4" y2="32" />
                  <line x1="10" y1="18" x2="10" y2="32" />
                  <line x1="16" y1="18" x2="16" y2="32" />
                  <line x1="4" y1="32" x2="16" y2="32" />
                </g>
                {/* Knife - right */}
                <g transform="translate(62, 30) rotate(15, 10, 30)" stroke="hsl(var(--muted-foreground))" strokeOpacity="0.45" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="10" y1="18" x2="10" y2="58" />
                  <path d="M10 18 Q18 25 14 35 L10 35" fill="hsl(var(--muted-foreground))" fillOpacity="0.15" stroke="hsl(var(--muted-foreground))" strokeOpacity="0.45" strokeWidth="2" />
                </g>
                {/* Sparkles */}
                <circle cx="88" cy="28" r="2" fill="hsl(var(--muted-foreground))" fillOpacity="0.3" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
                <circle cx="30" cy="24" r="1.5" fill="hsl(var(--muted-foreground))" fillOpacity="0.25" style={{ animation: 'pulse 2.5s ease-in-out 0.5s infinite' }} />
                <circle cx="95" cy="50" r="1.5" fill="hsl(var(--muted-foreground))" fillOpacity="0.2" style={{ animation: 'pulse 2s ease-in-out 1s infinite' }} />
                <style>{`
                  @keyframes float { 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(-6px) } }
                `}</style>
              </svg>
            </div>
          </div>
          <h3 className="font-semibold text-foreground mb-1">Cardápio vazio</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Adicione seus lanches, bebidas e porções para exibi-los na página pública.
          </p>
          <Button onClick={openCreate} variant="outline" size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            Adicionar primeiro item
          </Button>
        </div>
      )}

      {/* Grouped items — compact list */}
      {!isLoading && grouped.map((group, groupIndex) => {
        const isPaused = localPausedCats.includes(group.value);
        return (
        <div key={group.value} className={isPaused ? "opacity-50" : ""}>
          <div className="flex items-center gap-2 mb-3 mt-6 first:mt-0">
            <Popover open={emojiPickerOpen === group.value} onOpenChange={(o) => setEmojiPickerOpen(o ? group.value : null)}>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center justify-center w-7 h-7 rounded-md border border-dashed border-border hover:border-primary hover:bg-accent transition-colors text-base leading-none"
                  title={localCategoryEmojis[group.value] ? "Trocar ícone" : "Adicionar ícone (opcional)"}
                  type="button"
                >
                  {localCategoryEmojis[group.value] || <span className="text-muted-foreground/50 text-xs">+</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">
                  Ícone para "{group.value}"
                </p>
                <div className="grid grid-cols-8 max-[380px]:grid-cols-6 gap-1 max-h-48 overflow-y-auto">
                  {CATEGORY_EMOJI_PALETTE.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setCategoryEmoji(group.value, e)}
                      className={cn(
                        "w-7 h-7 rounded hover:bg-accent transition-colors text-base leading-none flex items-center justify-center",
                        localCategoryEmojis[group.value] === e && "bg-primary/10 ring-1 ring-primary"
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                {localCategoryEmojis[group.value] && (
                  <button
                    type="button"
                    onClick={() => setCategoryEmoji(group.value, null)}
                    className="mt-2 w-full text-xs text-muted-foreground hover:text-destructive py-1.5 rounded hover:bg-accent transition-colors"
                  >
                    Remover ícone
                  </button>
                )}
              </PopoverContent>
            </Popover>
            <span className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              {group.value}
            </span>
            <span className="text-xs text-muted-foreground/60">({group.items.length})</span>
            {isPaused && (
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">Pausada</span>
            )}
            <div className="flex items-center gap-0.5 ml-1">
              <button
                onClick={() => togglePauseCategory(group.value)}
                className="p-1 rounded hover:bg-accent transition-colors"
                title={isPaused ? "Retomar categoria" : "Pausar categoria"}
              >
                {isPaused ? <Play className="w-4 h-4 text-primary" /> : <Pause className="w-4 h-4 text-muted-foreground" />}
              </button>
              <button
                onClick={() => moveCategoryOrder(groupIndex, "up")}
                disabled={groupIndex === 0}
                className="p-1 rounded hover:bg-accent disabled:opacity-30 transition-colors"
                title="Mover para cima"
              >
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => moveCategoryOrder(groupIndex, "down")}
                disabled={groupIndex === grouped.length - 1}
                className="p-1 rounded hover:bg-accent disabled:opacity-30 transition-colors"
                title="Mover para baixo"
              >
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
            {group.items.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col gap-2 px-4 py-3.5 bg-card hover:bg-secondary/40 transition-colors ${!item.available ? "opacity-50" : ""}`}
              >
                {/* Row 1: Image + Name + Price */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-amber-50 to-orange-100 shrink-0 flex items-center justify-center">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <UtensilsCrossed className="w-5 h-5 text-orange-300" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-foreground truncate leading-tight">{item.name}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground truncate leading-tight mt-0.5">{item.description}</p>
                    )}
                  </div>

                  <span className="text-base font-bold text-primary tabular-nums shrink-0 whitespace-nowrap">
                    {formatPrice(item.price)}
                  </span>
                </div>

                {/* Row 2: Action buttons */}
                <div className="flex items-center justify-end gap-1.5">
                  <Switch
                    checked={item.available}
                    onCheckedChange={() => handleToggleAvailable(item)}
                    disabled={updateMutation.isPending}
                    className="scale-90"
                  />
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(item)} title="Editar">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Popover open={moveCatOpen === item.id} onOpenChange={(open) => setMoveCatOpen(open ? item.id : null)}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground" title="Mover categoria">
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-1 max-h-60 overflow-y-auto" align="end">
                      <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Mover para:</p>
                      {[...new Set([...grouped.map(g => g.value), ...CATEGORIES.map(c => c.value)])].map((cat) => (
                        <button
                          key={cat}
                          className={cn(
                            "w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                            cat === item.category && "font-bold text-primary"
                          )}
                          disabled={cat === item.category}
                          onClick={() => {
                            updateMutation.mutate({ id: item.id, input: { category: cat } });
                            setMoveCatOpen(null);
                            toast({ title: "Item movido", description: `"${item.name}" → ${cat}` });
                          }}
                        >
                          {cat === item.category ? `✓ ${cat}` : cat}
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      if (limitReached) {
                        toast({ title: "Limite de itens atingido", description: "Faça upgrade para adicionar mais itens.", variant: "destructive" });
                        return;
                      }
                      setEditItem(null);
                      setEditItemId(null);
                      setForm({
                        name: `(Cópia) ${item.name}`,
                        description: item.description ?? "",
                        price: item.price,
                        category: item.category,
                        available: item.available,
                        imageFile: null,
                        image_url: null,
                      });
                      setImagePreview(item.image_url);
                      setModalOpen(true);
                    }}
                    title="Duplicar"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(item)} title="Remover">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      })}

      {/* Add/Edit Modal — pure React, no Radix Portal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80" />
          <div className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto bg-background border border-border rounded-lg p-6 mx-4 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground">
              {editItem || editItemId ? "Editar item" : "Novo item do cardápio"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {/* Image upload — always uses file input, no native camera picker */}
              <div>
                <Label className="text-sm font-medium">Foto</Label>
                <div className="mt-2 flex items-center gap-3">
                  <div className="w-20 h-20 rounded-xl border border-border bg-secondary overflow-hidden flex items-center justify-center shrink-0">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-6 h-6 text-muted-foreground opacity-40" />
                    )}
                  </div>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        // Persist draft BEFORE opening file picker (Android may destroy WebView)
                        persistDraft();
                        console.log("[MenuTab] Draft saved before file picker open");
                        fileRef.current?.click();
                      }}
                    >
                      <Camera className="w-4 h-4" />
                      {imagePreview ? "Alterar foto" : "Adicionar foto"}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG ou WebP. Máx 5MB.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">ou</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <Input
                  placeholder="Cole a URL da imagem aqui..."
                  value={form.imageFile ? "" : (form.image_url ?? "")}
                  onChange={(e) => {
                    const url = e.target.value;
                    setForm((p) => ({ ...p, image_url: url || null, imageFile: null }));
                    setImagePreview(url || null);
                  }}
                  className="mt-1 text-sm"
                />
              </div>

              {/* Name */}
              <div>
                <Label htmlFor="item-name" className="text-sm font-medium">
                  Nome <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="item-name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Burguer Artesanal"
                  className="mt-1"
                  required
                />
              </div>

              {/* Category — chips + editable input */}
              <div>
                <Label className="text-sm font-medium">Categoria</Label>
                {(() => {
                  const existingCategories = [...new Set(items.map((i) => i.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
                  const suggestedNotUsed = CATEGORIES
                    .map((c) => c.value)
                    .filter((v) => !existingCategories.includes(v));
                  return (
                    <>
                      {existingCategories.length > 0 && (
                        <>
                          <p className="text-xs text-muted-foreground mt-1.5 mb-1">Suas categorias</p>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {existingCategories.map((cat) => (
                              <button
                                key={`existing-${cat}`}
                                type="button"
                                onClick={() => setForm((p) => ({ ...p, category: cat }))}
                                className={cn(
                                  "px-2.5 py-1 rounded-full text-xs border-2 transition-colors font-medium",
                                  form.category === cat
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-secondary hover:bg-secondary/80 border-secondary text-secondary-foreground"
                                )}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                      {suggestedNotUsed.length > 0 && (
                        <>
                          <p className="text-xs text-muted-foreground mt-1 mb-1">Sugestões</p>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {suggestedNotUsed.map((cat) => (
                              <button
                                key={`suggested-${cat}`}
                                type="button"
                                onClick={() => setForm((p) => ({ ...p, category: cat }))}
                                className={cn(
                                  "px-2.5 py-1 rounded-full text-xs border transition-colors",
                                  form.category === cat
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-muted hover:bg-muted/80 border-border"
                                )}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
                <Input
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  placeholder="Ou digite uma categoria personalizada..."
                  className="text-sm"
                />
              </div>

              {/* Price */}
              <div>
                <Label htmlFor="item-price" className="text-sm font-medium">
                  Preço <span className="text-destructive">*</span>
                </Label>
                <CurrencyInput
                  id="item-price"
                  value={form.price}
                  onChange={(v) => { setPriceTouched(true); setForm((p) => ({ ...p, price: v })); }}
                  className="mt-1"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="item-desc" className="text-sm font-medium">
                  Descrição <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Textarea
                  id="item-desc"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Ex: Pão brioche, carne 180g, queijo cheddar, alface e tomate"
                  className="mt-1 resize-none"
                  rows={2}
                />
              </div>

              {/* Available toggle */}
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">Disponível</p>
                  <p className="text-xs text-muted-foreground">Item aparece disponível para pedir</p>
                </div>
                <Switch
                  checked={form.available}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, available: v }))}
                />
              </div>

              {/* Available days */}
              <div className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Dias disponíveis</p>
                  <Switch
                    checked={!form.available_days}
                    onCheckedChange={(allDays) => {
                      setForm((p) => ({ ...p, available_days: allDays ? null : ["seg","ter","qua","qui","sex","sab","dom"] }));
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {!form.available_days ? "Todos os dias" : "Selecione os dias em que este item estará disponível"}
                </p>
                {form.available_days && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {([
                      { key: "seg", label: "Seg" },
                      { key: "ter", label: "Ter" },
                      { key: "qua", label: "Qua" },
                      { key: "qui", label: "Qui" },
                      { key: "sex", label: "Sex" },
                      { key: "sab", label: "Sáb" },
                      { key: "dom", label: "Dom" },
                    ] as const).map((d) => {
                      const isActive = form.available_days!.includes(d.key);
                      return (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => {
                            setForm((p) => {
                              const days = p.available_days ?? [];
                              const next = isActive ? days.filter((x) => x !== d.key) : [...days, d.key];
                              return { ...p, available_days: next.length === 0 ? [d.key] : next };
                            });
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted hover:bg-muted/80 border-border text-muted-foreground"
                          )}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Ingredients section */}
              {canAccessStockIngredients ? (
                (editItem || editItemId) ? (
                  <IngredientsSection
                    menuItemId={(editItem?.id || editItemId)!}
                    stockItems={stockItems}
                    addIngredient={addIngredient}
                    removeIngredient={removeIngredient}
                    onCostChange={handleIngredientsCostChange}
                  />
                ) : (
                  <PendingIngredientsSection
                    stockItems={stockItems}
                    pending={pendingIngredients}
                    onChange={setPendingIngredients}
                    onCostChange={handleIngredientsCostChange}
                  />
                )
              ) : (
                <div className="border border-border rounded-lg p-4 flex items-center gap-3 bg-muted/30">
                  <Lock className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Composição do Produto</p>
                    <p className="text-xs text-muted-foreground">Disponível no plano Enterprise</p>
                  </div>
                </div>
              )}

              {/* Addons section */}
              {canAccessAddons ? (
                (editItem || editItemId) ? (
                  <AddonsSection
                    menuItemId={(editItem?.id || editItemId)!}
                    organizationId={organization.id}
                    hideGlobalAddons={editItem?.hide_global_addons ?? false}
                    onToggleHideGlobal={async (val) => {
                      const id = editItem?.id || editItemId;
                      if (!id) return;
                      const { supabase } = await import("@/integrations/supabase/client");
                      await supabase.from("menu_items").update({ hide_global_addons: val } as any).eq("id", id);
                      if (editItem) setEditItem({ ...editItem, hide_global_addons: val });
                    }}
                  />
                ) : (
                  <PendingAddonsSection
                    pending={pendingAddons}
                    onChange={setPendingAddons}
                    hideGlobalAddons={pendingHideGlobalAddons}
                    onToggleHideGlobal={setPendingHideGlobalAddons}
                    hasGlobalAddons={globalAddonsForCreate.filter(g => g.available).length > 0}
                  />
                )
              ) : (
                <div className="border border-border rounded-lg p-4 flex items-center gap-3 bg-muted/30">
                  <Lock className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Adicionais / Complementos</p>
                    <p className="text-xs text-muted-foreground">Disponível no plano Pro</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-2">
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending} className="gap-2">
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editItem || editItemId ? "Salvar alterações" : "Adicionar item"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover item?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> será removido do cardápio permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete ALL confirmation */}
      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar cardápio inteiro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação vai remover <strong>{items.length}</strong> {items.length === 1 ? "item" : "itens"} permanentemente, incluindo fotos.
              Não será possível desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteAllMutation.mutate(items.map((i) => ({ id: i.id, image_url: i.image_url })));
                setDeleteAllOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAllMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              Limpar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* File input OUTSIDE modal — always in DOM, survives Android WebView lifecycle */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

      {/* Import Modal */}
      <ImportMenuDialog open={importOpen} onOpenChange={setImportOpen} organization={organization} />
    </div>
  );
}
