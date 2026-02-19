import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

interface GrowthChartsProps {
  orgs: { created_at: string }[];
  orders: { created_at: string }[];
}

function getLast6Months() {
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    months.push({ key, label });
  }
  return months;
}

function countByMonth(items: { created_at: string }[], months: { key: string }[]) {
  const counts: Record<string, number> = {};
  months.forEach((m) => (counts[m.key] = 0));
  items.forEach((item) => {
    const d = new Date(item.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (key in counts) counts[key]++;
  });
  return counts;
}

export default function GrowthCharts({ orgs, orders }: GrowthChartsProps) {
  const months = useMemo(() => getLast6Months(), []);

  const storeData = useMemo(() => {
    const counts = countByMonth(orgs, months);
    return months.map((m) => ({ name: m.label, value: counts[m.key] }));
  }, [orgs, months]);

  const orderData = useMemo(() => {
    const counts = countByMonth(orders, months);
    return months.map((m) => ({ name: m.label, value: counts[m.key] }));
  }, [orders, months]);

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Crescimento da Plataforma</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Novas Lojas por Mês" data={storeData} color="hsl(221, 83%, 53%)" />
        <ChartCard title="Pedidos por Mês" data={orderData} color="hsl(142, 71%, 45%)" />
      </div>
    </section>
  );
}

function ChartCard({ title, data, color }: { title: string; data: { name: string; value: number }[]; color: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="text-xs font-semibold text-muted-foreground mb-4">{title}</p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
