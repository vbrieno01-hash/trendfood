import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, FileText, ExternalLink, AlertTriangle } from "lucide-react";
import { useFiscalInvoices, useFiscalInvoicesRealtime, type FiscalInvoice } from "@/hooks/useFiscalInvoices";
import OrderFiscalActions from "@/components/dashboard/OrderFiscalActions";

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function fmtBRL(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

function statusBadge(s: string) {
  const map: Record<string, string> = {
    authorized: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    pending: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    processing: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
    cancelled: "bg-muted text-muted-foreground border-border",
  };
  return <Badge variant="outline" className={map[s] || "bg-muted text-muted-foreground border-border"}>{s}</Badge>;
}

// MEI/ME/Simples annual limits (2026 reference — Simples Nacional)
const REGIME_LIMITS: Record<number, { name: string; limit: number }> = {
  4: { name: "MEI", limit: 81_000 },
  1: { name: "Simples Nacional", limit: 4_800_000 },
  2: { name: "Simples Nacional (sublimite)", limit: 3_600_000 },
  3: { name: "Lucro Presumido/Real", limit: 78_000_000 },
};

export default function FiscalHistoryTab({
  orgId, regime, monthlyRevenueEstimate,
}: {
  orgId: string;
  regime?: number | null;
  monthlyRevenueEstimate?: number;
}) {
  useFiscalInvoicesRealtime(orgId);

  const [period, setPeriod] = useState<"7" | "30" | "90" | "all">("30");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const since = useMemo(() => {
    if (period === "all") return undefined;
    const d = new Date();
    d.setDate(d.getDate() - Number(period));
    return d.toISOString();
  }, [period]);

  const { data: invoices = [], isLoading } = useFiscalInvoices(orgId, { since });

  const filtered = useMemo(() => {
    if (statusFilter === "all") return invoices;
    return invoices.filter(i => i.status === statusFilter);
  }, [invoices, statusFilter]);

  // Revenue alert (85% of annual limit, prorated monthly)
  const alert = useMemo(() => {
    if (!regime || !REGIME_LIMITS[regime] || !monthlyRevenueEstimate) return null;
    const { name, limit } = REGIME_LIMITS[regime];
    const annualProjection = monthlyRevenueEstimate * 12;
    const pct = annualProjection / limit;
    if (pct < 0.85) return null;
    return { name, limit, annualProjection, pct };
  }, [regime, monthlyRevenueEstimate]);

  function exportCSV() {
    const rows = [
      ["data", "numero", "serie", "pedido", "status", "chave", "danfe", "xml"],
      ...filtered.map((i: FiscalInvoice) => [
        i.created_at, i.numero ?? "", i.serie ?? "", i.order_id, i.status,
        i.chave_acesso ?? "", i.danfe_url ?? "", i.xml_url ?? "",
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nfce-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {alert && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-4 flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-foreground">Atenção ao limite do {alert.name}</p>
              <p className="text-muted-foreground">
                Projeção anual: <b>{fmtBRL(alert.annualProjection)}</b> ({Math.round(alert.pct * 100)}% do teto de {fmtBRL(alert.limit)}).
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Período</label>
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="all">Tudo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="authorized">Autorizadas</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="processing">Processando</SelectItem>
              <SelectItem value="rejected">Rejeitadas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0} className="ml-auto">
          <Download className="w-4 h-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium">Nenhuma nota fiscal no período</p>
            <p className="text-xs text-muted-foreground">Assim que houver emissões, elas aparecem aqui.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv) => (
            <Card key={inv.id}>
              <CardContent className="py-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{fmtDate(inv.created_at)}</span>
                  {inv.numero != null && (
                    <span className="text-xs font-mono text-foreground">nº {inv.numero}/{inv.serie ?? 1}</span>
                  )}
                </div>
                {statusBadge(inv.status)}
                {inv.chave_acesso && (
                  <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[220px]" title={inv.chave_acesso}>
                    {inv.chave_acesso}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2 flex-wrap">
                  {inv.xml_url && (
                    <Button asChild size="sm" variant="ghost">
                      <a href={inv.xml_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 mr-1" /> XML
                      </a>
                    </Button>
                  )}
                  <OrderFiscalActions orgId={orgId} orderId={inv.order_id} invoice={inv} compact />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}