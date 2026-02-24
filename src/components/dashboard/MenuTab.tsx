import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Pencil, Trash2, Camera, Loader2, UtensilsCrossed, Copy, ArrowUpDown,
} from "lucide-react";
import { pickPhotoNative, isNativePlatform } from "@/lib/nativeCamera";
import {
  useMenuItems, useAddMenuItem, useUpdateMenuItem, useDeleteMenuItem,
  CATEGORIES, MenuItem, MenuItemInput, SortOrder,
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
  category: "Hambúrgueres",
  available: true,
  imageFile: null,
  image_url: null,
};

const SORT_KEY = "menu_sort_order";

export default function MenuTab({ organization, menuItemLimit }: { organization: Organization; menuItemLimit?: number | null }) {
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => (localStorage.getItem(SORT_KEY) as SortOrder) || "newest");
  const { data: items = [], isLoading } = useMenuItems(organization.id, sortOrder);
  const addMutation = useAddMenuItem(organization.id);
  const updateMutation = useUpdateMenuItem(organization.id);
  const deleteMutation = useDeleteMenuItem(organization.id);

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState<MenuItemInput>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    items: items.filter((i) => i.category === cat.value),
  })).filter((g) => g.items.length > 0);

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
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setModalOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditItem(item);
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Foto muito grande", description: "Máximo 5MB.", variant: "destructive" });
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
      setForm((p) => ({ ...p, imageFile: file }));
      setImagePreview(URL.createObjectURL(file));
    } catch (err) {
      console.error("[MenuTab] Image select error:", err);
      toast({ title: "Erro ao selecionar foto", variant: "destructive" });
    }
  };

  const handleNativePhoto = async () => {
    try {
      const file = await pickPhotoNative();
      if (!file) return;
      console.log(`[MenuTab] Native photo received: ${file.name}, size: ${file.size} bytes`);
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Foto muito grande", description: "Máximo 5MB.", variant: "destructive" });
        return;
      }
      setForm((p) => ({ ...p, imageFile: file }));
      setImagePreview(URL.createObjectURL(file));
      toast({ title: "Foto selecionada ✓", description: `${(file.size / 1024).toFixed(0)} KB` });
    } catch (err) {
      console.error("[MenuTab] Native photo error:", err);
      toast({ title: "Erro ao selecionar foto", variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log(`[MenuTab] Submitting: editItem=${editItem?.id ?? "NEW"}, hasImageFile=${!!form.imageFile}, imageFileSize=${form.imageFile?.size ?? 0}`);
      if (editItem) {
        await updateMutation.mutateAsync({ id: editItem.id, input: form });
      } else {
        await addMutation.mutateAsync(form);
      }
      console.log("[MenuTab] Submit success");
      setModalOpen(false);
    } catch (err) {
      console.error("[MenuTab] Submit error:", err);
      toast({ title: "Erro ao salvar item", description: String(err), variant: "destructive" });
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

  const isPending = addMutation.isPending || updateMutation.isPending;

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
          {/* Category header — sem emoji */}
          <div className="flex items-center gap-3 mb-3 mt-6 first:mt-0">
            <span className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              {group.value}
            </span>
            <span className="text-xs text-muted-foreground/60">({group.items.length})</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Item rows */}
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
            {group.items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-4 py-3.5 bg-card hover:bg-secondary/40 transition-colors ${!item.available ? "opacity-50" : ""}`}
              >
                {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-gradient-to-br from-amber-50 to-orange-100 shrink-0 flex items-center justify-center">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <UtensilsCrossed className="w-5 h-5 text-orange-300" />
                  )}
                </div>

                {/* Name + description */}
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-foreground truncate leading-tight">{item.name}</p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground truncate leading-tight mt-0.5">{item.description}</p>
                  )}
                </div>

                {/* Price */}
                <span className="text-base font-bold text-primary tabular-nums shrink-0 w-24 text-right">
                  {formatPrice(item.price)}
                </span>

                {/* Switch + actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Switch
                    checked={item.available}
                    onCheckedChange={() => handleToggleAvailable(item)}
                    disabled={updateMutation.isPending}
                    className="scale-90"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-muted-foreground hover:text-foreground"
                    onClick={() => openEdit(item)}
                    title="Editar"
                  >
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(item)}
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Editar item" : "Novo item do cardápio"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image upload */}
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
                      if (isNativePlatform()) {
                        handleNativePhoto();
                      } else {
                        fileRef.current?.click();
                      }
                    }}
                  >
                    <Camera className="w-4 h-4" />
                    {imagePreview ? "Alterar foto" : "Adicionar foto"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG ou WebP. Máx 5MB.</p>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
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

            {/* Category */}
            <div>
              <Label className="text-sm font-medium">Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.emoji} {c.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="gap-2">
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {editItem ? "Salvar alterações" : "Adicionar item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
