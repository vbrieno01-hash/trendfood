import { useState, useMemo, useRef } from "react";
import {
  useOrgDeliveries,
  useOrgCouriers,
  useOrgShiftHistory,
  type DateRange,
} from "@/hooks/useCourier";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bike, MapPin, Clock, DollarSign, Download, FileImage, FileText, TrendingUp,
} from "lucide-react";
import { subDays, startOfDay, endOfDay, differenceInMinutes } from "date-fns";
import html2canvas from "html2canvas";

interface Props {
  orgId: string;
  orgName: string;
  orgEmoji: string;
  orgLogo?: string | null;
  orgWhatsapp?: string | null;
  orgAddress?: string | null;
}

type Period = "7d" | "30d" | "90d";

const PERIOD_OPTIONS: { key: Period; label: string; days: number }[] = [
  { key: "7d", label: "7 dias", days: 7 },
  { key: "30d", label: "30 dias", days: 30 },
  { key: "90d", label: "90 dias", days: 90 },
];

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function formatHours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ""}` : `${m}min`;
}

export default function CourierReportSection({
  orgId, orgName, orgEmoji, orgLogo, orgWhatsapp, orgAddress,
}: Props) {
  const [period, setPeriod] = useState<Period>("30d");
  const reportRef = useRef<HTMLDivElement>(null);

  const days = PERIOD_OPTIONS.find((o) => o.key === period)!.days;
  const dateRange: DateRange = useMemo(() => ({
    from: startOfDay(subDays(new Date(), days)).toISOString(),
    to: endOfDay(new Date()).toISOString(),
  }), [days]);

  const { data: deliveries = [] } = useOrgDeliveries(orgId, dateRange);
  const { data: couriers = [] } = useOrgCouriers(orgId);
  const { data: shifts = [] } = useOrgShiftHistory(orgId, dateRange);

  const completed = useMemo(() => deliveries.filter((d) => d.status === "entregue"), [deliveries]);

  // KPIs
  const kpis = useMemo(() => {
    const totalDeliveries = completed.length;
    const totalPaid = completed.reduce((s, d) => s + (d.fee ?? 0), 0);
    const totalKm = completed.reduce((s, d) => s + (d.distance_km ?? 0), 0);
    const totalMinutes = shifts.reduce((s, sh) => {
      const end = sh.ended_at ? new Date(sh.ended_at) : new Date();
      return s + differenceInMinutes(end, new Date(sh.started_at));
    }, 0);
    return { totalDeliveries, totalPaid, totalKm, totalMinutes };
  }, [completed, shifts]);

  // Ranking
  const courierMap = useMemo(() => new Map(couriers.map((c) => [c.id, c])), [couriers]);

  const ranking = useMemo(() => {
    const map = new Map<string, { name: string; deliveries: number; km: number; fee: number; minutes: number }>();

    for (const d of completed) {
      const cid = d.courier_id || "unknown";
      const existing = map.get(cid) || {
        name: d.courier_id ? courierMap.get(d.courier_id)?.name || "Desconhecido" : "Sem motoboy",
        deliveries: 0, km: 0, fee: 0, minutes: 0,
      };
      existing.deliveries += 1;
      existing.km += d.distance_km ?? 0;
      existing.fee += d.fee ?? 0;
      map.set(cid, existing);
    }

    // Add shift hours
    for (const sh of shifts) {
      const cid = sh.courier_id;
      const existing = map.get(cid);
      if (existing) {
        const end = sh.ended_at ? new Date(sh.ended_at) : new Date();
        existing.minutes += differenceInMinutes(end, new Date(sh.started_at));
      }
    }

    return Array.from(map.values()).sort((a, b) => b.deliveries - a.deliveries);
  }, [completed, shifts, courierMap]);

  const maxDeliveries = useMemo(() => Math.max(...ranking.map((r) => r.deliveries), 1), [ranking]);

  // Daily deliveries chart
  const dailyDeliveries = useMemo(() => {
    const map: Record<string, number> = {};
    completed.forEach((d) => {
      const day = d.created_at.slice(0, 10);
      map[day] = (map[day] ?? 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date: new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        entregas: count,
      }));
  }, [completed]);

  // Peak hours chart
  const peakHours = useMemo(() => {
    const hourCounts = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, "0")}h`,
      entregas: 0,
    }));
    completed.forEach((d) => {
      const h = new Date(d.created_at).getHours();
      hourCounts[h].entregas++;
    });
    return hourCounts;
  }, [completed]);

  const maxPeakHour = useMemo(() => Math.max(...peakHours.map((h) => h.entregas), 1), [peakHours]);

  const periodLabel = PERIOD_OPTIONS.find((o) => o.key === period)?.label ?? period;

  // Export
  const buildReportHtml = (forImage = false) => {
    const cleanAddress = orgAddress?.replace(/\|/g, ", ") ?? "";
    const formattedWhatsapp = orgWhatsapp
      ? orgWhatsapp.replace(/^55(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3").replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3")
      : "";
    const emissionDate = new Date().toLocaleString("pt-BR");
    const trendfoodLogo = window.location.origin + "/logo-trendfood.png";
    const watermarkHtml = `<div style="position:${forImage ? "absolute" : "fixed"};top:50%;left:50%;transform:translate(-50%,-50%);width:60%;opacity:0.06;pointer-events:none;z-index:0"><img src="${trendfoodLogo}" style="width:100%;height:auto" /></div>`;

    const headerLogoHtml = orgLogo
      ? `<img src="${orgLogo}" style="width:48px;height:48px;border-radius:10px;object-fit:contain" />`
      : "";

    const rankingRows = ranking
      .map((r, i) => `<tr><td>${i + 1}</td><td>${r.name}</td><td>${r.deliveries}</td><td>${r.km.toFixed(1)} km</td><td>${fmtBRL(r.fee)}</td><td>${formatHours(r.minutes)}</td></tr>`)
      .join("");

    const dailyRows = dailyDeliveries
      .map((d) => `<tr><td>${d.date}</td><td>${d.entregas}</td></tr>`)
      .join("");

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório de Motoboys - ${orgName}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:system-ui,-apple-system,sans-serif;padding:32px 40px;color:#1a1a1a;position:relative;background:#fff}
  .header{display:flex;align-items:center;gap:14px;margin-bottom:6px}
  .store-name{font-size:22px;font-weight:800;color:#111}
  .store-info{color:#555;font-size:12px;margin-top:2px}
  .report-title{font-size:16px;font-weight:700;color:#222;margin-top:16px;padding-bottom:6px;border-bottom:2px solid #111}
  .emission{font-size:11px;color:#888;margin-top:4px;margin-bottom:20px}
  h2{font-size:14px;font-weight:700;margin-top:28px;margin-bottom:8px;color:#333;text-transform:uppercase;letter-spacing:0.5px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{text-align:left;padding:7px 10px;border-bottom:1px solid #e5e5e5}
  th{font-weight:700;background:#f5f5f5;color:#333;font-size:11px;text-transform:uppercase;letter-spacing:0.3px}
  .kpi-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:12px}
  .kpi{padding:14px 16px;border:1px solid #e0e0e0;border-radius:10px;background:#fafafa}
  .kpi .label{font-size:11px;color:#777;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:4px}
  .kpi .value{font-size:20px;font-weight:800;color:#111}
  .footer{margin-top:40px;padding-top:12px;border-top:1px solid #ddd;font-size:10px;color:#999;text-align:center}
  @media print{body{padding:20px 24px}button{display:none}.kpi{break-inside:avoid}table{break-inside:auto}tr{break-inside:avoid}}
</style></head><body>
${watermarkHtml}
<div style="position:relative;z-index:1">
  <div class="header">${headerLogoHtml}<div><div class="store-name">${orgEmoji} ${orgName}</div>
  <div class="store-info">${cleanAddress}${cleanAddress && formattedWhatsapp ? " • " : ""}${formattedWhatsapp ? "WhatsApp: " + formattedWhatsapp : ""}</div></div></div>
  <div class="report-title">Relatório de Motoboys — ${periodLabel}</div>
  <div class="emission">Emitido em ${emissionDate}</div>
  <div class="kpi-grid">
    <div class="kpi"><div class="label">Total de Entregas</div><div class="value">${kpis.totalDeliveries}</div></div>
    <div class="kpi"><div class="label">Total Pago</div><div class="value">${fmtBRL(kpis.totalPaid)}</div></div>
    <div class="kpi"><div class="label">Distância Total</div><div class="value">${kpis.totalKm.toFixed(1)} km</div></div>
    <div class="kpi"><div class="label">Tempo Trabalhado</div><div class="value">${formatHours(kpis.totalMinutes)}</div></div>
  </div>
  ${ranking.length > 0 ? `<h2>Ranking de Motoboys</h2><table><thead><tr><th>#</th><th>Nome</th><th>Entregas</th><th>Km</th><th>Ganho</th><th>Horas</th></tr></thead><tbody>${rankingRows}</tbody></table>` : ""}
  ${dailyDeliveries.length > 0 ? `<h2>Entregas por Dia</h2><table><thead><tr><th>Data</th><th>Entregas</th></tr></thead><tbody>${dailyRows}</tbody></table>` : ""}
  <div class="footer">Relatório gerado via TrendFood • ${emissionDate}</div>
</div></body></html>`;
  };

  const handleDownloadPDF = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(buildReportHtml(false) + `<script>window.onload=function(){window.print()}</script>`);
    w.document.close();
  };

  const handleDownloadImage = async () => {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;left:-9999px;width:800px;height:2000px;border:none";
    document.body.appendChild(iframe);
    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) { document.body.removeChild(iframe); return; }
    iframeDoc.open();
    iframeDoc.write(buildReportHtml(true));
    iframeDoc.close();
    await new Promise((r) => setTimeout(r, 800));
    try {
      const canvas = await html2canvas(iframeDoc.body, { scale: 2, useCORS: true, backgroundColor: "#ffffff", width: 800 });
      const link = document.createElement("a");
      link.download = `relatorio-motoboys-${orgName.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      handleDownloadPDF();
    } finally {
      document.body.removeChild(iframe);
    }
  };

  return (
    <div className="space-y-6" ref={reportRef}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Relatório de Motoboys
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Desempenho dos motoboys no período selecionado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-secondary rounded-lg p-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setPeriod(opt.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  period === opt.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Download className="w-4 h-4 mr-1" />
                Baixar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownloadImage}>
                <FileImage className="w-4 h-4 mr-2" />
                Imagem (PNG)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPDF}>
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Bike className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-xs text-muted-foreground">Entregas</span>
            </div>
            <p className="font-bold text-foreground text-xl">{kpis.totalDeliveries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">Total Pago</span>
            </div>
            <p className="font-bold text-foreground text-xl">{fmtBRL(kpis.totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-xs text-muted-foreground">Distância</span>
            </div>
            <p className="font-bold text-foreground text-xl">{kpis.totalKm.toFixed(1)} km</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-xs text-muted-foreground">Tempo Total</span>
            </div>
            <p className="font-bold text-foreground text-xl">{formatHours(kpis.totalMinutes)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Ranking */}
      {ranking.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-foreground text-sm mb-4">🏆 Ranking de Motoboys</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Entregas</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Km</TableHead>
                  <TableHead className="text-right">Ganho</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Horas</TableHead>
                  <TableHead className="w-24 hidden md:table-cell">Progresso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right">{r.deliveries}</TableCell>
                    <TableCell className="text-right hidden sm:table-cell">{r.km.toFixed(1)}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">{fmtBRL(r.fee)}</TableCell>
                    <TableCell className="text-right hidden sm:table-cell">{formatHours(r.minutes)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Progress value={(r.deliveries / maxDeliveries) * 100} className="h-2" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Daily deliveries chart */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">📦 Entregas por Dia</h3>
          {dailyDeliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados para o período.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyDeliveries}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
                    formatter={(value: number) => [`${value} entregas`, "Entregas"]}
                  />
                  <Bar dataKey="entregas" radius={[4, 4, 0, 0]}>
                    {dailyDeliveries.map((_, i) => (
                      <Cell key={i} fill="hsl(var(--primary))" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Peak hours chart */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">⏰ Horários de Pico de Entrega</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHours}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" interval={1} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
                  formatter={(value: number) => [`${value} entregas`, "Entregas"]}
                />
                <Bar dataKey="entregas" radius={[3, 3, 0, 0]}>
                  {peakHours.map((entry, i) => (
                    <Cell key={i} fill={entry.entregas >= maxPeakHour * 0.7 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
