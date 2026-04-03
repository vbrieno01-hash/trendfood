import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, Download, FileText, Loader2, Search, DollarSign, ShoppingBag } from "lucide-react";
import { format, startOfMonth, endOfDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const PAYMENT_LABELS: Record<string, string> = {
  pix: "PIX",
  cash: "Dinheiro",
  credit: "Cartão Crédito",
  debit: "Cartão Débito",
  pending: "Pendente",
};

interface OrderRow {
  id: string;
  order_number: number | null;
  created_at: string;
  payment_method: string | null;
  org_name: string;
  total: number;
}

export default function AdminReportsTab() {
  const [from, setFrom] = useState<Date>(startOfMonth(new Date()));
  const [to, setTo] = useState<Date>(new Date());
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    setLoading(true);
    try {
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("id, order_number, created_at, payment_method, organization_id, order_items(price, quantity)")
        .gte("created_at", startOfDay(from).toISOString())
        .lte("created_at", endOfDay(to).toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      const orgIds = [...new Set((ordersData ?? []).map((o) => o.organization_id))];
      const { data: orgsData } = await supabase
        .from("organizations")
        .select("id, name")
        .in("id", orgIds.length ? orgIds : ["__none__"]);

      const orgMap: Record<string, string> = {};
      (orgsData ?? []).forEach((o) => (orgMap[o.id] = o.name));

      const rows: OrderRow[] = (ordersData ?? []).map((o) => ({
        id: o.id,
        order_number: o.order_number,
        created_at: o.created_at,
        payment_method: o.payment_method,
        org_name: orgMap[o.organization_id] || "—",
        total: (o.order_items as any[])?.reduce((s: number, i: any) => s + i.price * i.quantity, 0) ?? 0,
      }));

      setOrders(rows);
      setSearched(true);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao buscar pedidos");
    } finally {
      setLoading(false);
    }
  }

  const totalRevenue = useMemo(() => orders.reduce((s, o) => s + o.total, 0), [orders]);

  function exportCSV() {
    const header = "Pedido,Loja,Data,Valor,Pagamento";
    const lines = orders.map((o) =>
      [
        `#${o.order_number ?? o.id.slice(0, 8)}`,
        `"${o.org_name}"`,
        format(new Date(o.created_at), "dd/MM/yyyy HH:mm"),
        o.total.toFixed(2).replace(".", ","),
        PAYMENT_LABELS[o.payment_method ?? ""] || o.payment_method || "—",
      ].join(",")
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_${format(from, "ddMMyyyy")}_${format(to, "ddMMyyyy")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  }

  function exportPDF() {
    const w = window.open("", "_blank");
    if (!w) return;
    const rows = orders
      .map(
        (o) =>
          `<tr>
            <td style="padding:6px 10px;border-bottom:1px solid #eee">#${o.order_number ?? o.id.slice(0, 8)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee">${o.org_name}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee">${format(new Date(o.created_at), "dd/MM/yyyy HH:mm")}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${fmt(o.total)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee">${PAYMENT_LABELS[o.payment_method ?? ""] || o.payment_method || "—"}</td>
          </tr>`
      )
      .join("");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório TrendFood</title>
      <style>body{font-family:Arial,sans-serif;padding:40px;color:#1a1a1a}
      table{width:100%;border-collapse:collapse;margin-top:20px}
      th{background:#f5f5f5;text-align:left;padding:8px 10px;border-bottom:2px solid #ddd;font-size:13px}
      td{font-size:13px}
      h1{font-size:20px;margin-bottom:4px}
      .meta{color:#666;font-size:13px;margin-bottom:16px}
      .summary{display:flex;gap:24px;margin-bottom:12px}
      .summary div{background:#f9f9f9;padding:12px 20px;border-radius:8px}
      .summary .label{font-size:12px;color:#888}.summary .val{font-size:20px;font-weight:700}
      @media print{body{padding:20px}}
      </style></head><body>
      <h1>TrendFood — Relatório de Faturamento</h1>
      <p class="meta">Período: ${format(from, "dd/MM/yyyy")} a ${format(to, "dd/MM/yyyy")} · Emitido em ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
      <div class="summary">
        <div><span class="label">Total Faturado</span><br><span class="val">${fmt(totalRevenue)}</span></div>
        <div><span class="label">Pedidos</span><br><span class="val">${orders.length}</span></div>
      </div>
      <table><thead><tr><th>Pedido</th><th>Loja</th><th>Data</th><th style="text-align:right">Valor</th><th>Pagamento</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }

  return (
    <div className="space-y-6 animate-admin-fade-in">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold">Relatório de Faturamento</h2>
      </div>

      {/* Date filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <DatePicker label="De" date={from} onSelect={(d) => d && setFrom(d)} />
            <DatePicker label="Até" date={to} onSelect={(d) => d && setTo(d)} />
            <Button onClick={handleSearch} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {searched && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="bg-emerald-500/10 p-3 rounded-xl">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Faturado</p>
                  <p className="text-2xl font-bold">{fmt(totalRevenue)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-xl">
                  <ShoppingBag className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pedidos</p>
                  <p className="text-2xl font-bold">{orders.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Export buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={exportCSV} className="gap-2" disabled={!orders.length}>
              <Download className="w-4 h-4" /> Exportar CSV
            </Button>
            <Button variant="outline" onClick={exportPDF} className="gap-2" disabled={!orders.length}>
              <FileText className="w-4 h-4" /> Exportar PDF
            </Button>
          </div>

          {/* Orders table */}
          {orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">Nenhum pedido encontrado no período selecionado.</p>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">#{o.order_number ?? o.id.slice(0, 8)}</TableCell>
                      <TableCell>{o.org_name}</TableCell>
                      <TableCell>{format(new Date(o.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(o.total)}</TableCell>
                      <TableCell>{PAYMENT_LABELS[o.payment_method ?? ""] || o.payment_method || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function DatePicker({ label, date, onSelect }: { label: string; date: Date; onSelect: (d: Date | undefined) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(date, "dd/MM/yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={date} onSelect={onSelect} initialFocus className="p-3 pointer-events-auto" locale={ptBR} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
