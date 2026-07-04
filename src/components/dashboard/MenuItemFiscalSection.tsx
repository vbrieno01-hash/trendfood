import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, FileText, Loader2, AlertTriangle } from "lucide-react";
import { usePlatformFeatureFlags } from "@/hooks/usePlatformFeatureFlags";
import { useAuth } from "@/hooks/useAuth";

type FiscalFields = {
  ncm: string | null;
  cfop: string | null;
  cest: string | null;
  cst_csosn: string | null;
  origem: number | null;
  unidade: string | null;
  codigo_ean: string | null;
};

type Defaults = {
  default_ncm: string | null;
  cfop_padrao: string | null;
  default_cst_csosn: string | null;
  default_origem: number | null;
  default_unidade: string | null;
  default_cest: string | null;
  enabled: boolean;
};

const EMPTY: FiscalFields = {
  ncm: "", cfop: "", cest: "", cst_csosn: "", origem: null, unidade: "", codigo_ean: "",
};

export default function MenuItemFiscalSection({ orgId, itemId }: { orgId: string; itemId: string }) {
  const { data: flags } = usePlatformFeatureFlags();
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaults, setDefaults] = useState<Defaults | null>(null);
  const [form, setForm] = useState<FiscalFields>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: item }, { data: cfg }] = await Promise.all([
        supabase.from("menu_items")
          .select("ncm, cfop, cest, cst_csosn, origem, unidade, codigo_ean")
          .eq("id", itemId).maybeSingle(),
        supabase.from("fiscal_config")
          .select("default_ncm, cfop_padrao, default_cst_csosn, default_origem, default_unidade, default_cest, enabled")
          .eq("organization_id", orgId).maybeSingle(),
      ]);
      if (cancelled) return;
      if (item) setForm({
        ncm: item.ncm ?? "", cfop: item.cfop ?? "", cest: item.cest ?? "",
        cst_csosn: item.cst_csosn ?? "", origem: item.origem ?? null,
        unidade: item.unidade ?? "", codigo_ean: item.codigo_ean ?? "",
      });
      setDefaults((cfg as Defaults) ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [orgId, itemId]);

  const effective = {
    ncm: form.ncm || defaults?.default_ncm || "",
    cfop: form.cfop || defaults?.cfop_padrao || "",
    cst_csosn: form.cst_csosn || defaults?.default_cst_csosn || "",
    origem: form.origem ?? defaults?.default_origem ?? null,
  };
  const missingNcm = defaults?.enabled && !effective.ncm;

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase.from("menu_items").update({
        ncm: form.ncm || null,
        cfop: form.cfop || null,
        cest: form.cest || null,
        cst_csosn: form.cst_csosn || null,
        origem: form.origem,
        unidade: form.unidade || null,
        codigo_ean: form.codigo_ean || null,
      } as any).eq("id", itemId);
      if (error) throw error;
      toast.success("Dados fiscais salvos");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar dados fiscais");
    } finally { setSaving(false); }
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border border-border rounded-lg">
      <CollapsibleTrigger asChild>
        <button type="button" className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-muted/40 transition-colors">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Fiscal (NFC-e)</span>
          {missingNcm && (
            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3 h-3" /> NCM ausente
            </span>
          )}
          <ChevronDown className={`w-4 h-4 ml-auto text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 pt-1 space-y-3">
        {loading ? (
          <div className="text-xs text-muted-foreground">Carregando…</div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Deixe em branco para usar os padrões definidos em <b>Fiscal → Configuração</b>.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FField label="NCM" value={form.ncm ?? ""} placeholder={defaults?.default_ncm || "8 dígitos"} onChange={v => setForm(f => ({ ...f, ncm: v }))} />
              <FField label="CFOP" value={form.cfop ?? ""} placeholder={defaults?.cfop_padrao || "5102"} onChange={v => setForm(f => ({ ...f, cfop: v }))} />
              <FField label="CEST" value={form.cest ?? ""} placeholder={defaults?.default_cest || "opcional"} onChange={v => setForm(f => ({ ...f, cest: v }))} />
              <FField label="CST/CSOSN" value={form.cst_csosn ?? ""} placeholder={defaults?.default_cst_csosn || "102"} onChange={v => setForm(f => ({ ...f, cst_csosn: v }))} />
              <div className="space-y-1.5">
                <Label className="text-xs">Origem</Label>
                <Select value={form.origem != null ? String(form.origem) : ""} onValueChange={v => setForm(f => ({ ...f, origem: v === "" ? null : Number(v) }))}>
                  <SelectTrigger><SelectValue placeholder={defaults?.default_origem != null ? `Padrão: ${defaults.default_origem}` : "Selecione"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 — Nacional</SelectItem>
                    <SelectItem value="1">1 — Estrangeira (importação direta)</SelectItem>
                    <SelectItem value="2">2 — Estrangeira (mercado interno)</SelectItem>
                    <SelectItem value="3">3 — Nacional com conteúdo &gt; 40%</SelectItem>
                    <SelectItem value="4">4 — Nacional produzida via processos básicos</SelectItem>
                    <SelectItem value="5">5 — Nacional com conteúdo ≤ 40%</SelectItem>
                    <SelectItem value="6">6 — Estrangeira sem similar nacional</SelectItem>
                    <SelectItem value="7">7 — Estrangeira sem similar (mercado interno)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <FField label="Unidade" value={form.unidade ?? ""} placeholder={defaults?.default_unidade || "UN"} onChange={v => setForm(f => ({ ...f, unidade: v.toUpperCase().slice(0, 6) }))} />
              <FField label="Código EAN/GTIN" value={form.codigo_ean ?? ""} placeholder="opcional" onChange={v => setForm(f => ({ ...f, codigo_ean: v }))} />
            </div>
            <div className="flex justify-end pt-1">
              <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin"/>Salvando…</> : "Salvar fiscal"}
              </Button>
            </div>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function FField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}