import { useState, useRef, useEffect, useCallback } from "react";
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
// Select removed — category is now a free-text input with datalist
import {
  Plus, Pencil, Trash2, Camera, Loader2, UtensilsCrossed, Copy, ArrowUpDown,
} from "lucide-react";
import {
  useMenuItems, useAddMenuItem, useUpdateMenuItem, useDeleteMenuItem,
  uploadMenuImage, CATEGORIES, MenuItem, MenuItemInput, SortOrder,
} from "@/hooks/useMenuItems";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

const EMPTY_FORM: MenuItemInput = {
  name: "",
  description: "",
  price: 0,
  category: "Lanches com 1 hambúrguer e sem batata frita",
  available: true,
  imageFile: null,
  image_url: null,
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

export default function MenuTab({ organization, menuItemLimit }: { organization: Organization; menuItemLimit?: number | null }) {
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => (localStorage.getItem(SORT_KEY) as SortOrder) || "newest");
  
  const { data: items = [], isLoading } = useMenuItems(organization.id, sortOrder);
  const addMutation = useAddMenuItem(organization.id);
  const updateMutation = useUpdateMenuItem(organization.id);
  const deleteMutation = useDeleteMenuItem(organization.id);

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
        form: { name: form.name, description: form.description, price: form.price, category: form.category, available: form.available, image_url: form.image_url },
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

  // Collect custom categories not in CATEGORIES
  const knownValues = new Set(CATEGORIES.map(c => c.value));
  const customCats = [...new Set(items.map(i => i.category).filter(c => !knownValues.has(c)))].sort();

  // customCats used for grouping below

  const grouped = [
    ...CATEGORIES.map((cat) => ({
      value: cat.value,
      items: items.filter((i) => i.category === cat.value),
    })),
    ...customCats.map((cat) => ({
      value: cat,
      items: items.filter((i) => i.category === cat),
    })),
  ].filter((g) => g.items.length > 0);

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
    setModalOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditItem(item);
    setEditItemId(item.id);
    setForm({
      name: item.name,
      description: item.description ?? "",
      price: item.price,
      category: item.category,
      available: item.available,
      imageFile: null,
      image_url: item.image_url,
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
    setForm((p) => ({ ...p, imageFile: file }));
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
        await addMutation.mutateAsync(payload);
      }
      closeModal();
    } catch (err) {
      console.error("[MenuTab] Submit error:", err);
      toast({ title: "Erro ao salvar item", description: String(err), variant: "destructive" });
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
          <Button onClick={openCreate} size="sm" className="gap-1.5 h-9" disabled={limitReached}>
            <Plus className="w-4 h-4" />
            Novo item
          </Button>
        </div>
      </div>

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
          <UtensilsCrossed className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
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
      {!isLoading && grouped.map((group) => (
        <div key={group.value}>
          <div className="flex items-center gap-3 mb-3 mt-6 first:mt-0">
            <span className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              {group.value}
            </span>
            <span className="text-xs text-muted-foreground/60">({group.items.length})</span>
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
      ))}

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
                <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, category: c.value }))}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs border transition-colors",
                        form.category === c.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted hover:bg-muted/80 border-border"
                      )}
                    >
                      {c.emoji} {c.value}
                    </button>
                  ))}
                </div>
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
                  onChange={(v) => setForm((p) => ({ ...p, price: v }))}
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

      {/* File input OUTSIDE modal — always in DOM, survives Android WebView lifecycle */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
    </div>
  );
}
