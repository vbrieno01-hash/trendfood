import { useSuggestions } from "@/hooks/useSuggestions";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, TrendingUp, Clock, Sparkles, ListChecks } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  analyzing: "Analisando",
  on_menu: "No Cardápio",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  analyzing: "bg-blue-100 text-blue-800 border-blue-200",
  on_menu: "bg-green-100 text-green-800 border-green-200",
};

interface Organization {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  primary_color: string;
  logo_url: string | null;
  subscription_status?: string;
}

export default function HomeTab({ organization }: { organization: Organization }) {
  const { data: suggestions = [], isLoading } = useSuggestions(organization.id);

  const total = suggestions.length;
  const pending = suggestions.filter((s) => s.status === "pending").length;
  const analyzing = suggestions.filter((s) => s.status === "analyzing").length;
  const onMenu = suggestions.filter((s) => s.status === "on_menu").length;

  const top5 = [...suggestions].sort((a, b) => b.votes - a.votes).slice(0, 5);

  const stats = [
    { label: "Total", value: total, icon: <ListChecks className="w-5 h-5" />, color: "text-foreground" },
    { label: "Pendentes", value: pending, icon: <Clock className="w-5 h-5" />, color: "text-yellow-600" },
    { label: "Analisando", value: analyzing, icon: <TrendingUp className="w-5 h-5" />, color: "text-blue-600" },
    { label: "No Cardápio", value: onMenu, icon: <Sparkles className="w-5 h-5" />, color: "text-green-600" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Olá! 👋 {organization.emoji} {organization.name}
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-muted-foreground text-sm">Aqui está um resumo das suas sugestões</p>
          {organization.subscription_status && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
              organization.subscription_status === "active"
                ? "bg-green-50 text-green-700 border-green-200"
                : organization.subscription_status === "inactive"
                ? "bg-destructive/10 text-destructive border-destructive/20"
                : "bg-yellow-50 text-yellow-700 border-yellow-200"
            }`}>
              {organization.subscription_status === "active"
                ? "✓ Plano Ativo"
                : organization.subscription_status === "inactive"
                ? "✗ Inativo"
                : "⏳ Período de Teste"}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border border-border shadow-sm">
            <CardContent className="p-4 flex flex-col gap-2">
              <div className={`${stat.color}`}>{stat.icon}</div>
              <p className="text-3xl font-black text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top 5 */}
      <div>
        <h2 className="font-bold text-foreground text-lg mb-3 flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500 fill-red-500" />
          Top 5 mais votadas
        </h2>
        {top5.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="text-3xl mb-2">💡</p>
            <p className="font-medium text-foreground">Nenhuma sugestão ainda</p>
            <p className="text-muted-foreground text-sm mt-1">Compartilhe o link da sua lanchonete para receber sugestões!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {top5.map((s, i) => (
              <Card key={s.id} className="border border-border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{s.name}</p>
                    {s.description && (
                      <p className="text-muted-foreground text-xs truncate">{s.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-xs border ${STATUS_COLORS[s.status] ?? ""}`}>
                      {STATUS_LABELS[s.status] ?? s.status}
                    </Badge>
                    <span className="flex items-center gap-1 text-sm font-bold text-red-500">
                      <Heart className="w-3.5 h-3.5 fill-red-500" />
                      {s.votes}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
