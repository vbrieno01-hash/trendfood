import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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

  const mrrData = useMemo(() => {
    return months.map((m) => {
      const [year, month] = m.key.split("-").map(Number);
      const monthEnd = new Date(year, month, 0, 23, 59, 59);
      const orgsAtMonth = orgs.filter((o) => new Date(o.created_at) <= monthEnd);
      const pro = orgsAtMonth.filter((o) => o.subscription_plan === "pro").length;
      const enterprise = orgsAtMonth.filter((o) => o.subscription_plan === "enterprise").length;
      const mrr = pro * 99 + enterprise * 249;
      return { name: m.label, value: mrr };
    });
  }, [orgs, months]);

  return (
    <section className="animate-admin-slide-up admin-delay-3">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-primary/60" />
        <h2 className="text-sm font-bold text-foreground">Crescimento da Plataforma</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Novas Lojas por Mês" data={storeData} colorId="stores" color="hsl(24, 95%, 53%)" delay={1} />
        <ChartCard title="MRR por Mês" data={mrrData} colorId="mrr" color="hsl(142, 71%, 45%)" isCurrency delay={2} />
      </div>
    </section>
  );
}

function CustomTooltip({ active, payload, label, isCurrency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="admin-glass rounded-xl px-3.5 py-2.5 shadow-xl">
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-bold text-foreground">
        {isCurrency ? fmt(payload[0].value) : payload[0].value}
      </p>
    </div>
  );
}

function ChartCard({ title, data, colorId, color, isCurrency, delay }: {
  title: string;
  data: { name: string; value: number }[];
  colorId: string;
  color: string;
  isCurrency?: boolean;
  delay?: number;
}) {
  const lastValue = data[data.length - 1]?.value ?? 0;

  return (
    <div className={`admin-glass rounded-2xl p-5 hover:shadow-lg transition-all duration-300 animate-admin-fade-in admin-delay-${delay ?? 1}`}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
        <div className="text-right">
          <p className="text-lg font-bold text-foreground leading-none animate-admin-count-up">
            {isCurrency ? fmt(lastValue) : lastValue}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">atual</p>
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${colorId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fontWeight: 500 }}
              stroke="hsl(var(--muted-foreground))"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fontWeight: 500 }}
              stroke="hsl(var(--muted-foreground))"
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip isCurrency={isCurrency} />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2.5}
              fill={`url(#gradient-${colorId})`}
              dot={{ r: 4, fill: color, stroke: "hsl(var(--card))", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: color, stroke: "hsl(var(--card))", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
