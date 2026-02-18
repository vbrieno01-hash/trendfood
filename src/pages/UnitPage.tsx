import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ChefHat, Heart, ArrowLeft, LayoutDashboard, Send } from "lucide-react";
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

const statusClass: Record<SuggestionStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  in_production: "bg-blue-100 text-blue-800 border-blue-200",
  finished: "bg-green-100 text-green-800 border-green-200",
};

const UnitPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const org = organizations.find((o) => o.slug === slug);

  const [suggestions, setSuggestions] = useState<Suggestion[]>(() =>
    initialSuggestions
      .filter((s) => s.organization_id === org?.id)
      .sort((a, b) => b.votes - a.votes)
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Track voted suggestions via localStorage
  const [votedIds, setVotedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`voted-${slug}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    if (!org) navigate("/404");
  }, [org, navigate]);

  if (!org) return null;

  const handleVote = (id: string) => {
    if (votedIds.has(id)) return;
    const updated = suggestions
      .map((s) => (s.id === id ? { ...s, votes: s.votes + 1 } : s))
      .sort((a, b) => b.votes - a.votes);
    setSuggestions(updated);
    const newVoted = new Set(votedIds).add(id);
    setVotedIds(newVoted);
    localStorage.setItem(`voted-${slug}`, JSON.stringify([...newVoted]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const newSuggestion: Suggestion = {
      id: `s-${Date.now()}`,
      organization_id: org.id,
      name: name.trim(),
      description: description.trim(),
      votes: 0,
      status: "pending",
      created_at: new Date().toISOString(),
    };
    setSuggestions((prev) => [newSuggestion, ...prev].sort((a, b) => b.votes - a.votes));
    setName("");
    setDescription("");
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border/60 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Início</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{org.emoji}</span>
            <div>
              <p className="font-bold text-foreground text-sm leading-tight">{org.name}</p>
            </div>
          </div>
          <Link
            to={`/unidade/${slug}/dashboard`}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">Painel</span>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-16 pt-6">
        {/* Banner */}
        <div className="bg-primary/8 border border-primary/20 rounded-2xl p-5 mb-6">
          <p className="text-xl font-bold text-foreground mb-1">{org.description}</p>
          <p className="text-muted-foreground text-sm">
            💡 Sugira um novo item e vote nos favoritos — as melhores ideias entram no cardápio!
          </p>
        </div>

        {/* Suggestion Form */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-8 shadow-sm">
          <h2 className="font-bold text-foreground text-lg mb-4 flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-primary" />
            Sugerir novo item
          </h2>
          {submitted ? (
            <div className="text-center py-4">
              <p className="text-2xl mb-2">🎉</p>
              <p className="font-semibold text-foreground">Sugestão enviada!</p>
              <p className="text-muted-foreground text-sm">Obrigado pela sua ideia.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label htmlFor="sug-name" className="text-sm font-medium">
                  Nome do item <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="sug-name"
                  placeholder="Ex: Burguer de Costela"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="sug-desc" className="text-sm font-medium">
                  Descrição <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Textarea
                  id="sug-desc"
                  placeholder="Descreva os ingredientes, o molho, o que torna especial..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 resize-none"
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full gap-2">
                <Send className="w-4 h-4" />
                Enviar sugestão
              </Button>
            </form>
          )}
        </div>

        {/* Suggestions list */}
        <h2 className="font-bold text-foreground text-lg mb-4">
          💬 Sugestões da galera{" "}
          <span className="text-muted-foreground font-normal text-base">({suggestions.length})</span>
        </h2>
        <div className="space-y-3">
          {suggestions.map((s, index) => {
            const hasVoted = votedIds.has(s.id);
            return (
              <Card key={s.id} className="border border-border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {index + 1}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-foreground text-sm leading-snug">{s.name}</h3>
                        <Badge
                          className={`text-xs shrink-0 border ${statusClass[s.status]}`}
                          variant="outline"
                        >
                          {statusLabel[s.status]}
                        </Badge>
                      </div>
                      {s.description && (
                        <p className="text-muted-foreground text-xs leading-relaxed">{s.description}</p>
                      )}
                    </div>
                  </div>
                  {/* Vote button */}
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={() => handleVote(s.id)}
                      disabled={hasVoted}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                        hasVoted
                          ? "bg-red-50 text-red-500 cursor-not-allowed border border-red-100"
                          : "bg-secondary text-muted-foreground hover:bg-red-50 hover:text-red-500 border border-border hover:border-red-100"
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${hasVoted ? "fill-red-500" : ""}`} />
                      <span>{s.votes}</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default UnitPage;
