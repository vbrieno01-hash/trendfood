import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Lock,
  Heart,
  ChevronRight,
  LogOut,
  ExternalLink,
} from "lucide-react";
import {
  organizations,
  suggestions as initialSuggestions,
  Suggestion,
  SuggestionStatus,
} from "@/data/mockData";

const statusLabel: Record<SuggestionStatus, string> = {
  pending: "Pendente",
  in_production: "Em Produção",
  finished: "Finalizado",
};

const statusBadgeClass: Record<SuggestionStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  in_production: "bg-blue-100 text-blue-800 border-blue-200",
  finished: "bg-green-100 text-green-800 border-green-200",
};

const statusOptions: { value: SuggestionStatus; label: string }[] = [
  { value: "pending", label: "⏳ Pendente" },
  { value: "in_production", label: "🔵 Em Produção" },
  { value: "finished", label: "✅ Finalizado" },
];

const DashboardPage = () => {
  const { slug } = useParams<{ slug: string }>();
  
  const org = organizations.find((o) => o.slug === slug);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [suggestions, setSuggestions] = useState<Suggestion[]>(() =>
    initialSuggestions
      .filter((s) => s.organization_id === org?.id)
      .sort((a, b) => b.votes - a.votes)
  );
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

  if (!org) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-2xl mb-2">😕</p>
          <h1 className="font-bold text-foreground mb-2">Estabelecimento não encontrado</h1>
          <Link to="/" className="text-primary underline text-sm">Voltar ao início</Link>
        </div>
      </div>
    );
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === org.password) {
      setIsLoggedIn(true);
      setError("");
    } else {
      setError("Senha incorreta. Tente novamente.");
    }
  };

  const handleStatusChange = (id: string, status: SuggestionStatus) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
    setChangingStatus(null);
  };

  const filtered =
    activeTab === "all" ? suggestions : suggestions.filter((s) => s.status === activeTab);

  // Login screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <Link
            to={`/unidade/${slug}`}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para {org.name}
          </Link>
          <div className="bg-card border border-border rounded-2xl p-7 shadow-sm">
            <div className="text-center mb-6">
              <span className="text-4xl">{org.emoji}</span>
              <h1 className="font-bold text-foreground text-xl mt-2">{org.name}</h1>
              <p className="text-muted-foreground text-sm mt-1">Painel do estabelecimento</p>
            </div>
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-6">
              <Lock className="w-4 h-4" />
              <span>Acesso protegido por senha</span>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="pwd" className="text-sm font-medium">Senha do painel</Label>
                <Input
                  id="pwd"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1"
                  autoFocus
                />
                {error && <p className="text-destructive text-xs mt-1.5">{error}</p>}
              </div>
              <Button type="submit" className="w-full">Entrar no painel</Button>
            </form>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Dica: senha é <code className="bg-secondary px-1 py-0.5 rounded">{org.password}</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border/60 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{org.emoji}</span>
            <div>
              <p className="font-bold text-foreground text-sm leading-tight">{org.name}</p>
              <p className="text-muted-foreground text-xs">Painel do lojista</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/unidade/${slug}`} className="gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ver página</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setIsLoggedIn(false); setPassword(""); }}
              className="gap-1.5 text-muted-foreground"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pb-16 pt-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total", count: suggestions.length, icon: "💬" },
            { label: "Pendentes", count: suggestions.filter(s => s.status === "pending").length, icon: "⏳" },
            { label: "Em Produção", count: suggestions.filter(s => s.status === "in_production").length, icon: "🔵" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-3 text-center shadow-sm">
              <p className="text-xl mb-0.5">{stat.icon}</p>
              <p className="text-2xl font-black text-foreground">{stat.count}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-4 grid grid-cols-4 h-auto">
            <TabsTrigger value="all" className="text-xs py-2">Todas</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs py-2">Pendente</TabsTrigger>
            <TabsTrigger value="in_production" className="text-xs py-2">Em Produção</TabsTrigger>
            <TabsTrigger value="finished" className="text-xs py-2">Finalizado</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-3xl mb-2">🗒️</p>
                <p className="font-medium">Nenhuma sugestão aqui ainda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((s, index) => (
                  <Card key={s.id} className="border border-border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Rank */}
                        <div className="shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {index + 1}
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-foreground text-sm leading-snug">{s.name}</h3>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
                                <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
                                {s.votes}
                              </span>
                            </div>
                          </div>
                          {s.description && (
                            <p className="text-muted-foreground text-xs leading-relaxed mb-2">{s.description}</p>
                          )}
                          {/* Status + change */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className={`text-xs border ${statusBadgeClass[s.status]}`}
                            >
                              {statusLabel[s.status]}
                            </Badge>
                            {changingStatus === s.id ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {statusOptions
                                  .filter((o) => o.value !== s.status)
                                  .map((o) => (
                                    <button
                                      key={o.value}
                                      onClick={() => handleStatusChange(s.id, o.value)}
                                      className="text-xs px-2 py-1 rounded-md bg-secondary hover:bg-secondary/70 text-secondary-foreground transition-colors"
                                    >
                                      {o.label}
                                    </button>
                                  ))}
                                <button
                                  onClick={() => setChangingStatus(null)}
                                  className="text-xs px-2 py-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setChangingStatus(s.id)}
                                className="text-xs text-primary flex items-center gap-0.5 hover:underline"
                              >
                                Alterar status
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DashboardPage;
