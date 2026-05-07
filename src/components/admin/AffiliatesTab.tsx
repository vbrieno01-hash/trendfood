import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Copy, Plus, Send, Eye, Pencil, Loader2 } from "lucide-react";

type Affiliate = {
  id: string;
  name: string;
  code: string;
  telegram_chat_id: string | null;
  commission_pct: number;
  pix_key: string | null;
  phone: string | null;
  active: boolean;
  notes: string | null;
  created_at: string;
};

type Commission = {
  id: string;
  affiliate_id: string;
  organization_id: string;
  amount_paid_cents: number;
  commission_cents: number;
  commission_pct: number;
  billing_cycle: string | null;
  status: "pending" | "released" | "paid" | "refunded";
  release_at: string;
  released_at: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  created_at: string;
  payment_id: string | null;
};

const fmtBRL = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleString("pt-BR") : "—";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente (7d)", cls: "bg-yellow-500/20 text-yellow-200 border-yellow-500/40" },
  released: { label: "Liberado", cls: "bg-green-500/20 text-green-200 border-green-500/40" },
  paid: { label: "Pago", cls: "bg-blue-500/20 text-blue-200 border-blue-500/40" },
  refunded: { label: "Reembolsado", cls: "bg-red-500/20 text-red-200 border-red-500/40" },
};

function makeCode(name: string) {
  const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "").slice(0, 12);
  const rand = Math.random().toString(36).slice(2, 6);
  return (slug || "aff") + rand;
}

export default function AffiliatesTab() {
  const [items, setItems] = useState<Affiliate[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [orgsMap, setOrgsMap] = useState<Record<string, { name: string; slug: string; created_at: string }>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Affiliate> | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailsOf, setDetailsOf] = useState<Affiliate | null>(null);

  const PROD_URL = "https://trendfood.lovable.app";
  const baseUrl = `${PROD_URL}/auth`;

  async function load() {
    setLoading(true);
    const { data: aff } = await supabase.from("affiliates").select("*").order("created_at", { ascending: false });
    const { data: com } = await supabase.from("affiliate_commissions").select("*").order("created_at", { ascending: false });
    setItems((aff as Affiliate[]) || []);
    setCommissions((com as Commission[]) || []);
    const orgIds = Array.from(new Set([...(com || []).map((c: any) => c.organization_id)]));
    if (orgIds.length) {
      const { data: orgs } = await supabase.from("organizations").select("id, name, slug, created_at").in("id", orgIds);
      const map: Record<string, any> = {};
      (orgs || []).forEach((o: any) => { map[o.id] = o; });
      setOrgsMap(map);
    } else {
      setOrgsMap({});
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function totalsFor(affiliateId: string) {
    const list = commissions.filter(c => c.affiliate_id === affiliateId);
    let pending = 0, released = 0, paid = 0;
    for (const c of list) {
      if (c.status === "pending") pending += c.commission_cents;
      else if (c.status === "released") released += c.commission_cents;
      else if (c.status === "paid") paid += c.commission_cents;
    }
    const stores = new Set(list.map(c => c.organization_id)).size;
    return { pending, released, paid, stores };
  }

  async function handleSave() {
    if (!editing?.name) { toast.error("Informe o nome"); return; }
    setSaving(true);
    try {
      const payload: any = {
        name: editing.name,
        telegram_chat_id: editing.telegram_chat_id || null,
        commission_pct: editing.commission_pct ?? 50,
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
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function testTelegram(aff: Affiliate) {
    if (!aff.telegram_chat_id) { toast.error("Sem chat_id configurado"); return; }
    const t = toast.loading("Enviando teste...");
    try {
      const { error } = await supabase.functions.invoke("notify-affiliate-telegram", {
        body: { event_type: "test", test_chat_id: aff.telegram_chat_id },
      });
      if (error) throw error;
      toast.success("Mensagem de teste enviada!", { id: t });
    } catch (e: any) {
      toast.error("Falha: " + (e.message || e), { id: t });
    }
  }

  async function markReleasedAsPaid(affiliateId: string) {
    if (!confirm("Marcar todas as comissões liberadas deste afiliado como pagas?")) return;
    const { error } = await supabase
      .from("affiliate_commissions")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("affiliate_id", affiliateId)
      .eq("status", "released");
    if (error) { toast.error(error.message); return; }
    toast.success("Comissões marcadas como pagas");
    await load();
  }

  function copyLink(code: string) {
    const link = `${baseUrl}?aff=${code}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado: " + link);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Afiliados (Comissões)</h2>
          <p className="text-sm text-white/60">50% recorrente vitalício. Liberação após 7 dias.</p>
        </div>
        <Button onClick={() => setEditing({ active: true, commission_pct: 50 })}>
          <Plus className="w-4 h-4 mr-1" /> Novo afiliado
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-white/60"><Loader2 className="w-6 h-6 animate-spin inline" /></div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-white/60 border border-dashed border-white/10 rounded-xl">
          Nenhum afiliado ainda. Clique em "Novo afiliado".
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map(a => {
            const t = totalsFor(a.id);
            return (
              <div key={a.id} className="p-4 rounded-xl border border-white/10 bg-white/5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{a.name}</h3>
                      {!a.active && <Badge variant="outline">inativo</Badge>}
                      <Badge variant="outline">{a.commission_pct}%</Badge>
                    </div>
                    <div className="text-xs text-white/60 mt-1">
                      Código: <code className="text-white/80">{a.code}</code>
                      {a.telegram_chat_id ? <> · Telegram: <code>{a.telegram_chat_id}</code></> : <span className="text-yellow-300"> · sem Telegram</span>}
                      {a.pix_key && <> · PIX: <code>{a.pix_key}</code></>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => copyLink(a.code)}><Copy className="w-3 h-3 mr-1" />Link</Button>
                    <Button size="sm" variant="outline" onClick={() => testTelegram(a)}><Send className="w-3 h-3 mr-1" />Testar TG</Button>
                    <Button size="sm" variant="outline" onClick={() => setDetailsOf(a)}><Eye className="w-3 h-3 mr-1" />Detalhes</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(a)}><Pencil className="w-3 h-3 mr-1" />Editar</Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                  <div><span className="text-white/50">Lojas: </span><b>{t.stores}</b></div>
                  <div><span className="text-white/50">Pendente (7d): </span><b className="text-yellow-300">{fmtBRL(t.pending)}</b></div>
                  <div><span className="text-white/50">A pagar: </span><b className="text-green-300">{fmtBRL(t.released)}</b></div>
                  <div><span className="text-white/50">Já pago: </span><b className="text-blue-300">{fmtBRL(t.paid)}</b></div>
                </div>
                {t.released > 0 && (
                  <Button size="sm" className="mt-3" onClick={() => markReleasedAsPaid(a.id)}>
                    Marcar {fmtBRL(t.released)} como pago
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar afiliado" : "Novo afiliado"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={editing?.name || ""} onChange={(e) => setEditing(s => ({ ...s, name: e.target.value }))} /></div>
            {editing?.id && <div><Label>Código (link)</Label><Input value={editing?.code || ""} disabled /></div>}
            <div><Label>Telegram chat_id</Label><Input value={editing?.telegram_chat_id || ""} placeholder="ex: 123456789" onChange={(e) => setEditing(s => ({ ...s, telegram_chat_id: e.target.value }))} /></div>
            <div><Label>Comissão (%)</Label><Input type="number" value={editing?.commission_pct ?? 50} onChange={(e) => setEditing(s => ({ ...s, commission_pct: Number(e.target.value) }))} /></div>
            <div><Label>Chave PIX</Label><Input value={editing?.pix_key || ""} onChange={(e) => setEditing(s => ({ ...s, pix_key: e.target.value }))} /></div>
            <div><Label>Telefone</Label><Input value={editing?.phone || ""} onChange={(e) => setEditing(s => ({ ...s, phone: e.target.value }))} /></div>
            <div className="flex items-center gap-2"><Switch checked={editing?.active ?? true} onCheckedChange={(v) => setEditing(s => ({ ...s, active: v }))} /><Label>Ativo</Label></div>
            <div><Label>Notas</Label><Textarea value={editing?.notes || ""} onChange={(e) => setEditing(s => ({ ...s, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details dialog */}
      <Dialog open={!!detailsOf} onOpenChange={(o) => !o && setDetailsOf(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Comissões — {detailsOf?.name}</DialogTitle></DialogHeader>
          {detailsOf && (() => {
            const list = commissions.filter(c => c.affiliate_id === detailsOf.id);
            const byOrg: Record<string, Commission[]> = {};
            list.forEach(c => { (byOrg[c.organization_id] ||= []).push(c); });
            const orgIds = Object.keys(byOrg);
            if (!orgIds.length) return <p className="text-sm text-white/60">Sem comissões ainda.</p>;
            return (
              <div className="space-y-4">
                {orgIds.map(oid => {
                  const o = orgsMap[oid];
                  const cs = byOrg[oid];
                  return (
                    <div key={oid} className="border border-white/10 rounded-lg p-3">
                      <div className="font-semibold">{o?.name || oid}</div>
                      <div className="text-xs text-white/50">Cadastrou: {o ? fmtDate(o.created_at) : "—"}</div>
                      <table className="w-full text-xs mt-2">
                        <thead className="text-white/50">
                          <tr><th className="text-left p-1">Pago em</th><th className="text-left p-1">Valor</th><th className="text-left p-1">Comissão</th><th className="text-left p-1">Status</th><th className="text-left p-1">Liberação</th></tr>
                        </thead>
                        <tbody>
                          {cs.map(c => (
                            <tr key={c.id} className="border-t border-white/5">
                              <td className="p-1">{fmtDate(c.created_at)}</td>
                              <td className="p-1">{fmtBRL(c.amount_paid_cents)}</td>
                              <td className="p-1">{fmtBRL(c.commission_cents)}</td>
                              <td className="p-1"><span className={`px-2 py-0.5 rounded border ${STATUS_BADGE[c.status]?.cls}`}>{STATUS_BADGE[c.status]?.label}</span></td>
                              <td className="p-1">{fmtDate(c.released_at || c.release_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}