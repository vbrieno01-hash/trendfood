import { useState } from "react";
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCoupons, useCreateCoupon, useUpdateCoupon, useDeleteCoupon } from "@/hooks/useCoupons";
import type { Coupon, CreateCouponPayload } from "@/hooks/useCoupons";

interface CouponsTabProps {
  orgId: string;
}

const getCouponStatus = (coupon: Coupon): "active" | "inactive" | "expired" => {
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return "expired";
  if (!coupon.active) return "inactive";
  return "active";
};

const statusBadge = (status: "active" | "inactive" | "expired") => {
  if (status === "active")
    return <Badge variant="secondary" className="text-green-800 border-green-300">Ativo</Badge>;
  if (status === "expired")
    return <Badge variant="outline" className="text-orange-700 border-orange-300">Expirado</Badge>;
  return <Badge variant="secondary">Inativo</Badge>;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

const defaultForm: CreateCouponPayload = {
  code: "",
  type: "percent",
  value: 10,
  min_order: 0,
  max_uses: null,
  expires_at: null,
};

export default function CouponsTab({ orgId }: CouponsTabProps) {
  const { data: coupons = [], isLoading } = useCoupons(orgId);
  const createCoupon = useCreateCoupon(orgId);
  const updateCoupon = useUpdateCoupon(orgId);
  const deleteCoupon = useDeleteCoupon(orgId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateCouponPayload>(defaultForm);

  const handleCreate = async () => {
    if (!form.code.trim()) return;
    await createCoupon.mutateAsync(form);
    setDialogOpen(false);
    setForm(defaultForm);
  };

  const handleToggle = (coupon: Coupon) => {
    updateCoupon.mutate({ id: coupon.id, updates: { active: !coupon.active } });
  };

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-foreground text-xl">Cupons de Desconto</h2>
          <span className="text-sm text-muted-foreground ml-1">
            {coupons.length} cupom{coupons.length !== 1 ? "ns" : ""}
          </span>
        </div>
        <Button size="sm" onClick={() => { setForm(defaultForm); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Cupom
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-muted-foreground animate-pulse py-8 text-center">Carregando cupons…</p>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <p className="text-4xl mb-3">🏷️</p>
          <p className="font-semibold text-foreground">Nenhum cupom criado ainda.</p>
          <p className="text-muted-foreground text-sm mt-1">Crie cupons de desconto para seus clientes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => {
            const status = getCouponStatus(coupon);
            return (
              <div
                key={coupon.id}
                className="bg-card border border-border rounded-xl p-4 flex items-center gap-4"
              >
                {/* Code */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-foreground text-base tracking-wider">
                      {coupon.code}
                    </span>
                    {statusBadge(status)}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span>
                      {coupon.type === "percent"
                        ? `${coupon.value}% de desconto`
                        : `R$ ${coupon.value.toFixed(2).replace(".", ",")} de desconto`}
                    </span>
                    {coupon.min_order > 0 && (
                      <span>· mín. R$ {coupon.min_order.toFixed(2).replace(".", ",")}</span>
                    )}
                    <span>
                      · {coupon.uses}{coupon.max_uses !== null ? `/${coupon.max_uses}` : ""} usos
                    </span>
                    {coupon.expires_at && (
                      <span>· expira {fmtDate(coupon.expires_at)}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggle(coupon)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title={coupon.active ? "Desativar" : "Ativar"}
                  >
                    {coupon.active ? (
                      <ToggleRight className="w-6 h-6 text-green-600" />
                    ) : (
                      <ToggleLeft className="w-6 h-6" />
                    )}
                  </button>
                  <button
                    onClick={() => setDeleteId(coupon.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar novo cupom</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Código do cupom</Label>
              <Input
                id="code"
                placeholder="EX: BEMVINDO10"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as "percent" | "fixed" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Porcentagem (%)</SelectItem>
                    <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="value">
                  {form.type === "percent" ? "Desconto (%)" : "Desconto (R$)"}
                </Label>
                <Input
                  id="value"
                  type="number"
                  min={0}
                  max={form.type === "percent" ? 100 : undefined}
                  step={form.type === "percent" ? 1 : 0.01}
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="min_order">Pedido mínimo (R$)</Label>
                <Input
                  id="min_order"
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.min_order}
                  onChange={(e) => setForm({ ...form, min_order: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max_uses">Limite de usos</Label>
                <Input
                  id="max_uses"
                  type="number"
                  min={1}
                  placeholder="Ilimitado"
                  value={form.max_uses ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, max_uses: e.target.value ? parseInt(e.target.value) : null })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expires_at">Validade (opcional)</Label>
              <Input
                id="expires_at"
                type="date"
                value={form.expires_at ? form.expires_at.split("T")[0] : ""}
                onChange={(e) =>
                  setForm({ ...form, expires_at: e.target.value ? `${e.target.value}T23:59:59Z` : null })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createCoupon.isPending || !form.code.trim()}>
              {createCoupon.isPending ? "Criando…" : "Criar Cupom"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Remover cupom?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cupom será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) deleteCoupon.mutate(deleteId);
                setDeleteId(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
