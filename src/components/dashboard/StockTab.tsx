import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStockItems, useAddStockItem, useUpdateStockItem, useDeleteStockItem, StockItem } from "@/hooks/useStockItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Package, Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CurrencyInput } from "@/components/ui/currency-input";
import StockAlertsPanel from "./StockAlertsPanel";
import { CommandHeader, CommandPanel, CommandEmpty, MetricTile } from "@/components/dashboard/command";

const UNITS = ["un", "kg", "g", "L", "ml", "pct", "cx"];

interface StockTabProps {
  orgId: string;
}

export default function StockTab({ orgId }: StockTabProps) {
  const { data: items = [], isLoading } = useStockItems(orgId);
  const addMut = useAddStockItem(orgId);
  const updateMut = useUpdateStockItem(orgId);
  const deleteMut = useDeleteStockItem(orgId);

  const qc = useQueryClient();
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`stock_items-${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stock_items", filter: `organization_id=eq.${orgId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["stock_items", orgId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, qc]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [form, setForm] = useState({ name: "", unit: "un", quantity: "", min_quantity: "", cost_per_unit: 0 });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", unit: "un", quantity: "", min_quantity: "0", cost_per_unit: 0 });
    setDialogOpen(true);
  };

  const openEdit = (item: StockItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      unit: item.unit,
      quantity: String(item.quantity),
      min_quantity: String(item.min_quantity),
      cost_per_unit: item.cost_per_unit,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const payload = {
      name: form.name.trim(),
      unit: form.unit,
      quantity: Number(form.quantity) || 0,
      min_quantity: Number(form.min_quantity) || 0,
      cost_per_unit: form.cost_per_unit,
    };
    if (!payload.name) return;

    if (editing) {
      updateMut.mutate({ id: editing.id, input: payload }, { onSuccess: () => setDialogOpen(false) });
    } else {
      addMut.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StockAlertsPanel orgId={orgId} />
      <CommandHeader
        eyebrow="Operações"
        title="Estoque de Insumos"
        subtitle="Controle automático de consumo por ficha técnica."
        icon={<Package className="w-5 h-5" />}
        actions={
          <Button size="sm" onClick={openNew} className="gap-1.5 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" /> Novo Insumo
          </Button>
        }
      />

      {items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricTile label="Insumos" value={items.length} />
          <MetricTile
            label="Em falta"
            value={items.filter((i) => i.quantity <= 0).length}
            trend={items.some((i) => i.quantity <= 0) ? "down" : "flat"}
          />
          <MetricTile
            label="Estoque baixo"
            value={items.filter((i) => i.min_quantity > 0 && i.quantity > 0 && i.quantity <= i.min_quantity).length}
          />
          <MetricTile
            label="Valor em estoque"
            value={`R$ ${items.reduce((s, i) => s + i.quantity * i.cost_per_unit, 0).toFixed(2).replace(".", ",")}`}
          />
        </div>
      )}

      {items.length === 0 ? (
        <CommandEmpty
          title="Nenhum insumo cadastrado"
          description="Adicione ingredientes para controlar o estoque automaticamente conforme os pedidos entram."
          icon={<Package className="w-8 h-8" />}
          action={
            <Button onClick={openNew} className="gap-1.5">
              <Plus className="w-4 h-4" /> Cadastrar primeiro insumo
            </Button>
          }
        />
      ) : (
        <CommandPanel eyebrow="Insumos" title="Catálogo de estoque" padding="none">
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-right">Custo/un</TableHead>
                  <TableHead className="text-right">Qtd. Atual</TableHead>
                  <TableHead className="text-right">Mín.</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const isLow = item.quantity <= item.min_quantity && item.min_quantity > 0;
                  const isZero = item.quantity <= 0;
                  return (
                    <TableRow key={item.id} className={isZero ? "bg-destructive/5" : isLow ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {item.name}
                          {isZero && <AlertTriangle className="w-4 h-4 text-destructive" />}
                          {isLow && !isZero && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                        </div>
                      </TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {item.cost_per_unit > 0 ? `R$ ${item.cost_per_unit.toFixed(2).replace(".", ",")}` : "—"}
                      </TableCell>
                      <TableCell className={`text-right font-mono ${isZero ? "text-destructive font-bold" : isLow ? "text-amber-600 font-semibold" : ""}`}>
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{item.min_quantity}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteMut.mutate(item.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
        </CommandPanel>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Insumo" : "Novo Insumo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Pão de hambúrguer" />
            </div>
            <div className="grid grid-cols-3 max-[380px]:grid-cols-2 gap-3">
              <div>
                <Label>Unidade</Label>
                <Select value={form.unit} onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantidade</Label>
                <Input type="number" min="0" step="0.01" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div>
                <Label>Mínimo</Label>
                <Input type="number" min="0" step="0.01" value={form.min_quantity} onChange={(e) => setForm((f) => ({ ...f, min_quantity: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Custo por unidade (R$)</Label>
              <CurrencyInput value={form.cost_per_unit} onChange={(v) => setForm((f) => ({ ...f, cost_per_unit: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={addMut.isPending || updateMut.isPending}>
              {editing ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
