import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus, Pencil, Trash2, Camera, Loader2, UtensilsCrossed,
} from "lucide-react";
import {
  useMenuItems,
  useAddMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
  CATEGORIES,
  MenuItem,
  MenuItemInput,
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

export default function MenuTab({ organization }: { organization: Organization }) {
  const { data: items = [], isLoading } = useMenuItems(organization.id);
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

  const totalCategories = grouped.length;
  const totalItems = items.length;

  const openCreate = () => {
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
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      return;
    }
    setForm((p) => ({ ...p, imageFile: file }));
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editItem) {
      await updateMutation.mutateAsync({ id: editItem.id, input: form });
    } else {
      await addMutation.mutateAsync(form);
    }
    setModalOpen(false);
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

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meu Cardápio</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isLoading ? "..." : `${totalItems} ${totalItems === 1 ? "item" : "itens"} · ${totalCategories} ${totalCategories === 1 ? "categoria" : "categorias"}`}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Item
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && items.length === 0 && (
        <div className="border border-dashed border-border rounded-2xl p-12 text-center">
          <UtensilsCrossed className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="font-semibold text-foreground mb-1">Cardápio vazio</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Adicione seus lanches, bebidas e porções para exibi-los na página pública.
          </p>
          <Button onClick={openCreate} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Adicionar primeiro item
          </Button>
        </div>
      )}

      {/* Grouped items */}
      {!isLoading && grouped.map((group) => (
        <div key={group.value}>
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <span>{group.emoji}</span>
            <span>{group.value}</span>
            <span className="text-muted-foreground font-normal text-sm">({group.items.length})</span>
          </h2>
          <div className="space-y-2">
            {group.items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 bg-card border border-border rounded-xl p-3 transition-opacity ${!item.available ? "opacity-60" : ""}`}
              >
                {/* Image */}
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-secondary shrink-0 flex items-center justify-center">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">{group.emoji}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground text-sm truncate">{item.name}</p>
                    {!item.available && (
                      <Badge variant="destructive" className="text-xs shrink-0">Indisponível</Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-muted-foreground text-xs truncate mt-0.5">{item.description}</p>
                  )}
                  <p className="text-sm font-semibold text-foreground mt-1">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.price)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={item.available}
                    onCheckedChange={() => handleToggleAvailable(item)}
                    disabled={updateMutation.isPending}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8"
                    onClick={() => openEdit(item)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(item)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
                    onClick={() => fileRef.current?.click()}
                  >
                    <Camera className="w-4 h-4" />
                    {imagePreview ? "Alterar foto" : "Adicionar foto"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG ou WebP. Máx 5MB.</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
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
              <Select
                value={form.category}
                onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}
              >
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
                Preço (R$) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="item-price"
                type="number"
                step="0.01"
                min="0"
                value={form.price || ""}
                onChange={(e) => setForm((p) => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                placeholder="25.90"
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
              Esta ação não pode ser desfeita.
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
