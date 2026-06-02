import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Copy, Send, Pencil, Loader2, Eye, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Affiliate, Goal, Commission } from "./useAffiliateData";
import { fmtBRL, nextPayoutDate } from "./csvUtils";
import GoalsTable from "./GoalsTable";

function makeCode(name: string) {
  const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "").slice(0, 12);
  const rand = Math.random().toString(36).slice(2, 6);
  return (slug || "aff") + rand;
}

export default function AffiliateCards({
  affiliates, goals, commissions, storesByAff, orgsMap,
}: {
  affiliates: Affiliate[];
  goals: Goal[];
  commissions: Commission[];
  storesByAff: Record<string, number>;
  orgsMap: Record<string, { name: string; slug: string }>;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Affiliate> | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailsOf, setDetailsOf] = useState<Affiliate | null>(null);
  const PROD_URL = "https://trendfood.site";
  const baseUrl = `${PROD_URL}/auth`;
  const cutoff = useMemo(() => nextPayoutDate(), []);

  function totalsFor(id: string) {
    const gs = goals.filter((g) => g.affiliate_id === id);
    const cs = commissions.filter((c) => c.affiliate_id === id);
    const active = gs.filter((g) => g.status === "active").length;
    const awaiting = gs.filter((g) => g.status === "awaiting_choice").length;
    const completed = gs.filter((g) => g.status === "completed").length;
    const toPay = cs
      .filter((c) => !c.paid_in_batch_id && c.status !== "cancelled" && new Date(c.release_at) <= cutoff)
      .reduce((s, c) => s + c.commission_cents, 0);
    const paid = cs
      .filter((c) => c.paid_in_batch_id || c.status === "paid")
      .reduce((s, c) => s + c.commission_cents, 0);
    return { active, awaiting, completed, toPay, paid, stores: storesByAff[id] ?? 0 };
  }

  async function handleSave() {
    if (!editing?.name) { toast.error("Informe o nome"); return; }
    setSaving(true);
    try {
      const payload: any = {
        name: editing.name,
        telegram_chat_id: editing.telegram_chat_id || null,
        pix_key: editing.pix_key || null,
        phone: editing.phone || null,
        active: editing.active ?? true,
        notes: editing.notes || null,
      };
      if (editing.id) {
        const { error } = await supabase.from("affiliates").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        payload.code = editing.code || makeCode(editing.name);
        const { error } = await supabase.from("affiliates").insert(payload);
        if (error) throw error;
      }
      toast.success("Afiliado salvo");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["aff"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function testTelegram(a: Affiliate) {
    if (!a.telegram_chat_id) { toast.error("Sem chat_id"); return; }
    const t = toast.loading("Enviando teste...");
    try {
      const { error } = await supabase.functions.invoke("notify-affiliate-telegram", {
        body: { event_type: "test", test_chat_id: a.telegram_chat_id },
      });
      if (error) throw error;
      toast.success("Enviado!", { id: t });
    } catch (e: any) {
      toast.error("Falha: " + (e.message || e), { id: t });
    }
  }

  function copyLink(code: string) {
    const link = `${baseUrl}?aff=${code}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado");
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setEditing({ active: true })}>
          <Plus className="w-4 h-4 mr-1" />Novo afiliado
        </Button>
      </div>

      {affiliates.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border border-dashed border-border/40 rounded-xl">
          Nenhum afiliado ainda.
        </div>
      ) : (
        <div className="grid gap-3">
          {affiliates.map((a) => {
            const t = totalsFor(a.id);
            return (
              <div key={a.id} className="p-4 rounded-xl border border-border/40 bg-muted/5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-base">{a.name}</h4>
                      {!a.active && <Badge variant="outline">inativo</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2">
                      <span>Código: <code className="text-foreground/80">{a.code}</code></span>
                      {a.telegram_chat_id ? <span>· TG: <code>{a.telegram_chat_id}</code></span> : <span className="text-amber-600">· sem Telegram</span>}
                      {a.pix_key ? <span>· PIX: <code>{a.pix_key}</code></span> : <span className="text-amber-600">· sem PIX</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" onClick={() => copyLink(a.code)}><Copy className="w-3 h-3 mr-1" />Link</Button>
                    <Button size="sm" variant="outline" onClick={() => testTelegram(a)}><Send className="w-3 h-3 mr-1" />TG</Button>
                    <Button size="sm" variant="outline" onClick={() => setDetailsOf(a)}><Eye className="w-3 h-3 mr-1" />Metas</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(a)}><Pencil className="w-3 h-3 mr-1" />Editar</Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-3 text-xs">
                  <Stat label="Lojas" value={t.stores} />
                  <Stat label="Aguardando" value={t.awaiting} accent="amber" />
                  <Stat label="Ativas" value={t.active} accent="blue" />
                  <Stat label="Concluídas" value={t.completed} accent="emerald" />
                  <Stat label="A pagar dia 5" value={fmtBRL(t.toPay)} accent="amber" />
                  <Stat label="Já pago" value={fmtBRL(t.paid)} accent="emerald" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar afiliado" : "Novo afiliado"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={editing?.name || ""} onChange={(e) => setEditing((s) => ({ ...s, name: e.target.value }))} /></div>
            {editing?.id && <div><Label>Código (link)</Label><Input value={editing?.code || ""} disabled /></div>}
            <div><Label>Telegram chat_id</Label><Input value={editing?.telegram_chat_id || ""} placeholder="ex: 123456789" onChange={(e) => setEditing((s) => ({ ...s, telegram_chat_id: e.target.value }))} /></div>
            <div><Label>Chave PIX</Label><Input value={editing?.pix_key || ""} onChange={(e) => setEditing((s) => ({ ...s, pix_key: e.target.value }))} /></div>
            <div><Label>Telefone</Label><Input value={editing?.phone || ""} onChange={(e) => setEditing((s) => ({ ...s, phone: e.target.value }))} /></div>
            <div className="flex items-center gap-2"><Switch checked={editing?.active ?? true} onCheckedChange={(v) => setEditing((s) => ({ ...s, active: v }))} /><Label>Ativo</Label></div>
            <div><Label>Notas</Label><Textarea value={editing?.notes || ""} onChange={(e) => setEditing((s) => ({ ...s, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailsOf} onOpenChange={(o) => !o && setDetailsOf(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Metas — {detailsOf?.name}</DialogTitle></DialogHeader>
          {detailsOf && (
            <GoalsTable
              goals={goals.filter((g) => g.affiliate_id === detailsOf.id)}
              affiliates={affiliates}
              commissions={commissions}
              orgsMap={orgsMap}
              hideAffiliateColumn
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: "amber" | "emerald" | "blue" }) {
  const cls = accent === "amber" ? "text-amber-600 dark:text-amber-400"
    : accent === "emerald" ? "text-emerald-600 dark:text-emerald-400"
    : accent === "blue" ? "text-blue-600 dark:text-blue-400" : "text-foreground";
  return (
    <div className="rounded-lg bg-background/40 border border-border/40 px-2 py-1.5">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={`font-bold ${cls}`}>{value}</div>
    </div>
  );
}