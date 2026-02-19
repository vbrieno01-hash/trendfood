import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

interface OrgLike {
  created_at: string;
  subscription_plan: string;
}

interface GrowthChartsProps {
  orgs: OrgLike[];
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

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function GrowthCharts({ orgs }: GrowthChartsProps) {
  const months = useMemo(() => getLast6Months(), []);

  const storeData = useMemo(() => {
    const counts = countByMonth(orgs, months);
    return months.map((m) => ({ name: m.label, value: counts[m.key] }));
  }, [orgs, months]);

  // MRR por mês — approximation: for each month, count orgs created before month-end with a paid plan
  const mrrData = useMemo(() => {
    return months.map((m) => {
      const [year, month] = m.key.split("-").map(Number);
      const monthEnd = new Date(year, month, 0, 23, 59, 59); // last day of month
      
      // Count orgs that existed by this month-end and currently have a paid plan
      const orgsAtMonth = orgs.filter((o) => new Date(o.created_at) <= monthEnd);
      const pro = orgsAtMonth.filter((o) => o.subscription_plan === "pro").length;
      const enterprise = orgsAtMonth.filter((o) => o.subscription_plan === "enterprise").length;
      const mrr = pro * 99 + enterprise * 249;
      
      return { name: m.label, value: mrr };
    });
  }, [orgs, months]);

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Crescimento da Plataforma</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Novas Lojas por Mês" data={storeData} color="hsl(221, 83%, 53%)" />
        <ChartCard title="MRR por Mês" data={mrrData} color="hsl(142, 71%, 45%)" isCurrency />
      </div>
    </section>
  );
}

function ChartCard({ title, data, color, isCurrency }: { title: string; data: { name: string; value: number }[]; color: string; isCurrency?: boolean }) {
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
              formatter={(value: number) => [isCurrency ? fmt(value) : value, ""]}
            />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
