import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Loader2,
  GripVertical,
} from "lucide-react";
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

interface PlanRow {
  id: string;
  key: string;
  name: string;
  price_cents: number;
  description: string | null;
  features: string[];
  highlighted: boolean;
  badge: string | null;
  checkout_url: string | null;
  webhook_secret_name: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
}

const emptyPlan: Omit<PlanRow, "id" | "created_at"> = {
  key: "",
  name: "",
  price_cents: 0,
  description: "",
  features: [],
  highlighted: false,
  badge: "",
  checkout_url: "",
  webhook_secret_name: "",
  sort_order: 0,
  active: true,
};

export default function PlansConfigSection() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null); // plan id or "new"
  const [form, setForm] = useState<Omit<PlanRow, "id" | "created_at">>(emptyPlan);
  const [featuresText, setFeaturesText] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function fetchPlans() {
    const { data, error } = await supabase
      .from("platform_plans")
      .select("*")
      .order("sort_order");
    if (error) {
      toast.error("Erro ao carregar planos");
      return;
    }
    const mapped = (data ?? []).map((d: any) => ({
      ...d,
      features: Array.isArray(d.features) ? d.features : [],
    }));
    setPlans(mapped);
    setLoading(false);
  }

  useEffect(() => { fetchPlans(); }, []);

  function startEdit(plan: PlanRow) {
    setEditing(plan.id);
    setForm({
      key: plan.key,
      name: plan.name,
      price_cents: plan.price_cents,
      description: plan.description ?? "",
      features: plan.features,
      highlighted: plan.highlighted,
      badge: plan.badge ?? "",
      checkout_url: plan.checkout_url ?? "",
      webhook_secret_name: plan.webhook_secret_name ?? "",
      sort_order: plan.sort_order,
      active: plan.active,
    });
    setFeaturesText(plan.features.join("\n"));
  }

  function startNew() {
    setEditing("new");
    setForm({ ...emptyPlan, sort_order: plans.length });
    setFeaturesText("");
  }

  function cancelEdit() {
    setEditing(null);
  }

  async function handleSave() {
    if (!form.key || !form.name) {
      toast.error("Key e Nome são obrigatórios");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      description: form.description || null,
      badge: form.badge || null,
      checkout_url: form.checkout_url || null,
      webhook_secret_name: form.webhook_secret_name || null,
      features: featuresText.split("\n").map((s) => s.trim()).filter(Boolean),
    };

    if (editing === "new") {
      const { error } = await supabase.from("platform_plans").insert(payload as any);
      if (error) { toast.error("Erro ao criar plano: " + error.message); setSaving(false); return; }
      toast.success("Plano criado!");
    } else {
      const { error } = await supabase.from("platform_plans").update(payload as any).eq("id", editing!);
      if (error) { toast.error("Erro ao salvar: " + error.message); setSaving(false); return; }
      toast.success("Plano atualizado!");
    }
    setSaving(false);
    setEditing(null);
    fetchPlans();
  }

  async function handleDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from("platform_plans").delete().eq("id", deleteId);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Plano excluído");
    setDeleteId(null);
    fetchPlans();
  }

  const fmtPrice = (cents: number) =>
    cents === 0 ? "Grátis" : `R$ ${(cents / 100).toFixed(0)}`;

  if (loading) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Planos e Checkout</h2>
        </div>
        {!editing && (
          <Button size="sm" variant="outline" onClick={startNew}>
            <Plus className="w-4 h-4 mr-1" /> Adicionar Plano
          </Button>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Existing plans list */}
        {plans.map((plan) => (
          <div key={plan.id} className="border-b border-border last:border-b-0">
            {editing === plan.id ? (
              <PlanForm
                form={form}
                setForm={setForm}
                featuresText={featuresText}
                setFeaturesText={setFeaturesText}
                saving={saving}
                onSave={handleSave}
                onCancel={cancelEdit}
              />
            ) : (
              <div className="flex items-center gap-3 px-5 py-4">
                <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{plan.name}</span>
                    <span className="text-xs text-muted-foreground">({plan.key})</span>
                    {plan.highlighted && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                        {plan.badge || "Destaque"}
                      </span>
                    )}
                    {!plan.active && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                        Inativo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {fmtPrice(plan.price_cents)}/mês · {plan.features.length} features
                  </p>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(plan)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(plan.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        ))}

        {/* New plan form */}
        {editing === "new" && (
          <div className="border-t border-border">
            <PlanForm
              form={form}
              setForm={setForm}
              featuresText={featuresText}
              setFeaturesText={setFeaturesText}
              saving={saving}
              onSave={handleSave}
              onCancel={cancelEdit}
            />
          </div>
        )}

        {plans.length === 0 && !editing && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum plano cadastrado.
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O plano será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function PlanForm({
  form,
  setForm,
  featuresText,
  setFeaturesText,
  saving,
  onSave,
  onCancel,
}: {
  form: Omit<PlanRow, "id" | "created_at">;
  setForm: React.Dispatch<React.SetStateAction<Omit<PlanRow, "id" | "created_at">>>;
  featuresText: string;
  setFeaturesText: (v: string) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="p-5 space-y-4 bg-muted/30">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Key (identificador)</Label>
          <Input
            value={form.key}
            onChange={(e) => setForm((p) => ({ ...p, key: e.target.value }))}
            placeholder="pro"
            className="h-9 text-sm mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Nome</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Pro"
            className="h-9 text-sm mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Preço (centavos)</Label>
          <Input
            type="number"
            value={form.price_cents}
            onChange={(e) => setForm((p) => ({ ...p, price_cents: parseInt(e.target.value) || 0 }))}
            className="h-9 text-sm mt-1"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Descrição</Label>
        <Input
          value={form.description ?? ""}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          placeholder="Para negócios que querem crescer"
          className="h-9 text-sm mt-1"
        />
      </div>

      <div>
        <Label className="text-xs">Features (uma por linha)</Label>
        <Textarea
          value={featuresText}
          onChange={(e) => setFeaturesText(e.target.value)}
          rows={4}
          className="text-sm mt-1"
          placeholder={"Itens ilimitados\nPainel de Produção (KDS)\nCupons de desconto"}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Ordem</Label>
          <Input
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm((p) => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
            className="h-9 text-sm mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Badge</Label>
          <Input
            value={form.badge ?? ""}
            onChange={(e) => setForm((p) => ({ ...p, badge: e.target.value }))}
            placeholder="Recomendado"
            className="h-9 text-sm mt-1"
          />
        </div>
        <div className="flex items-center gap-3 pt-5">
          <Switch
            checked={form.highlighted}
            onCheckedChange={(v) => setForm((p) => ({ ...p, highlighted: v }))}
          />
          <Label className="text-xs">Destaque</Label>
        </div>
        <div className="flex items-center gap-3 pt-5">
          <Switch
            checked={form.active}
            onCheckedChange={(v) => setForm((p) => ({ ...p, active: v }))}
          />
          <Label className="text-xs">Ativo</Label>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" /> Cancelar
        </Button>
      </div>
    </div>
  );
}

