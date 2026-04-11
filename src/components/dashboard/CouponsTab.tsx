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
      <div className="flex items-center justify-between flex-wrap gap-3 animate-dashboard-fade-in">
        <div className="flex items-center gap-3">
          <div className="dashboard-section-icon">
            <Tag className="w-5 h-5" />
          </div>
          <h2 className="font-bold text-foreground text-xl">Cupons de Desconto</h2>
          <span className="text-sm text-muted-foreground ml-1">
            {coupons.length} cupom{coupons.length !== 1 ? "ns" : ""}
          </span>
        </div>
        <Button size="sm" onClick={() => { setForm(defaultForm); setDialogOpen(true); }} className="shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Cupom
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-muted-foreground animate-pulse py-8 text-center">Carregando cupons…</p>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16 dashboard-glass rounded-2xl">
          <div className="relative mx-auto w-24 h-24 mb-3">
            <div className="animate-[float_3s_ease-in-out_infinite]">
              <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-24 h-24">
                <circle cx="60" cy="60" r="50" fill="url(#tagGlow)" className="animate-[pulse_3s_ease-in-out_infinite]" />
                <g className="animate-[tagBounce_2s_ease-in-out_infinite]" style={{transformOrigin: '60px 60px'}}>
                  <path d="M30 50 L60 25 L90 50 L90 85 Q90 90 85 90 L35 90 Q30 90 30 85Z" fill="hsl(var(--primary))" opacity="0.2" />
                  <path d="M34 52 L60 30 L86 52 L86 82 Q86 86 82 86 L38 86 Q34 86 34 82Z" fill="hsl(var(--primary))" opacity="0.35" />
                  <circle cx="60" cy="50" r="6" fill="none" stroke="white" strokeWidth="2.5" />
                  <line x1="48" y1="66" x2="72" y2="66" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
                  <line x1="52" y1="74" x2="68" y2="74" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
                </g>
                <path d="M20 40 Q60 20 100 40" stroke="hsl(var(--primary))" strokeWidth="1.5" fill="none" opacity="0.15" className="animate-[shineArc_3s_ease-in-out_infinite]" />
                <circle cx="92" cy="30" r="2.5" fill="#facc15" className="animate-[sparkle_2s_ease-in-out_infinite]" />
                <circle cx="28" cy="35" r="2" fill="#facc15" className="animate-[sparkle_2s_ease-in-out_0.7s_infinite]" />
                <defs>
                  <radialGradient id="tagGlow" cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
          </div>
          <p className="font-semibold text-foreground">Nenhum cupom criado ainda.</p>
          <p className="text-muted-foreground text-sm mt-1">Crie cupons de desconto para seus clientes.</p>
          <style>{`
            @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
            @keyframes tagBounce { 0%, 100% { transform: scale(1) rotate(0deg); } 50% { transform: scale(1.05) rotate(-2deg); } }
            @keyframes shineArc { 0% { stroke-dashoffset: 200; stroke-dasharray: 200; opacity: 0; } 50% { opacity: 0.3; } 100% { stroke-dashoffset: 0; stroke-dasharray: 200; opacity: 0; } }
            @keyframes sparkle { 0%, 100% { opacity: 0; transform: scale(0.5); } 50% { opacity: 1; transform: scale(1.3); } }
          `}</style>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => {
            const status = getCouponStatus(coupon);
            return (
              <div
                key={coupon.id}
                className="dashboard-glass rounded-xl p-4 flex items-center gap-4 dashboard-table-row"
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
