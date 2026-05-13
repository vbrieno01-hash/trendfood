import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

interface Props {
  orgId: string;
  orgName: string;
}

export default function StorePaymentsTab({ orgId, orgName }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    paid_at: new Date().toISOString().slice(0, 10),
    amount: "",
    plan: "pro",
    billing_cycle: "monthly",
    promo_applied: false,
    notes: "",
  });

  const { data: payments, isLoading } = useQuery({
    queryKey: ["admin-store-payments", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_payments")
        .select("*")
        .eq("organization_id", orgId)
        .order("paid_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const total = (payments ?? []).reduce((acc, p) => acc + p.amount_cents, 0);

  const createMut = useMutation({
    mutationFn: async () => {
      const cents = Math.round(parseFloat(form.amount.replace(",", ".")) * 100);
      if (!cents || cents <= 0) throw new Error("Valor inválido");
      const { error } = await supabase.from("subscription_payments").insert({
        organization_id: orgId,
        plan: form.plan,
        billing_cycle: form.billing_cycle,
        amount_cents: cents,
        promo_applied: form.promo_applied,
        paid_at: new Date(form.paid_at + "T12:00:00").toISOString(),
        source: "manual",
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pagamento registrado");
      setOpen(false);
      setForm({ ...form, amount: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["admin-store-payments", orgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subscription_payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pagamento removido");
      qc.invalidateQueries({ queryKey: ["admin-store-payments", orgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground">Pagamentos recebidos</h3>
          <p className="text-xs text-muted-foreground">
            Receita real de {orgName}. Webhooks gravam automaticamente; entradas manuais são para corrigir histórico.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> Adicionar pagamento
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-xs text-muted-foreground">Total recebido</div>
        <div className="text-2xl font-bold text-foreground tabular-nums">{fmt(total)}</div>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (payments?.length ?? 0) === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Nenhum pagamento registrado ainda.
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase">Data</th>
                <th className="text-left px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase">Plano</th>
                <th className="text-left px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase">Ciclo</th>
                <th className="text-right px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase">Valor</th>
                <th className="text-left px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase">Origem</th>
                <th className="text-left px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase">Obs.</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {payments!.map((p) => (
                <tr key={p.id} className="border-t border-border/50">
                  <td className="px-3 py-2 text-xs">{new Date(p.paid_at).toLocaleDateString("pt-BR")}</td>
                  <td className="px-3 py-2 text-xs uppercase">{p.plan}</td>
                  <td className="px-3 py-2 text-xs">{p.billing_cycle ?? "—"}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums font-semibold">
                    {fmt(p.amount_cents)} {p.promo_applied && <Badge variant="outline" className="ml-1 text-[9px]">promo</Badge>}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <Badge variant={p.source === "manual" ? "secondary" : "outline"} className="text-[10px]">
                      {p.source}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground max-w-[200px] truncate">{p.notes ?? ""}</td>
                  <td className="px-3 py-2 text-right">
                    {p.source === "manual" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Excluir este pagamento manual?")) deleteMut.mutate(p.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar pagamento manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data do pagamento</Label>
                <Input type="date" value={form.paid_at} onChange={(e) => setForm({ ...form, paid_at: e.target.value })} />
              </div>
              <div>
                <Label>Valor recebido (R$)</Label>
                <Input
                  inputMode="decimal"
                  placeholder="49,50"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Plano</Label>
                <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                    <SelectItem value="lifetime">Vitalício</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ciclo</Label>
                <Select value={form.billing_cycle} onValueChange={(v) => setForm({ ...form, billing_cycle: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                    <SelectItem value="one_time">Único</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="promo"
                type="checkbox"
                checked={form.promo_applied}
                onChange={(e) => setForm({ ...form, promo_applied: e.target.checked })}
              />
              <Label htmlFor="promo" className="cursor-pointer">Promoção aplicada (50% off etc.)</Label>
            </div>
            <div>
              <Label>Observação</Label>
              <Input
                placeholder="Ex.: 1ª mensalidade promocional 50%"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
              {createMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
