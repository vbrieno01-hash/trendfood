import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ChefHat, Heart, ArrowLeft, Send, Plus, X } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useSuggestions, useAddSuggestion, useIncrementVote } from "@/hooks/useSuggestions";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  analyzing: "Analisando",
  on_menu: "No Cardápio",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  analyzing: "bg-blue-100 text-blue-800 border-blue-200",
  on_menu: "bg-green-100 text-green-800 border-green-200",
};

const UnitPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: org, isLoading: orgLoading, isError } = useOrganization(slug);
  const { data: suggestions = [], isLoading: suggestionsLoading } = useSuggestions(org?.id);

  const addMutation = useAddSuggestion(org?.id ?? "");
  const voteMutation = useIncrementVote(org?.id ?? "");

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // LocalStorage voted ids
  const [votedIds, setVotedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`voted-${slug}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    if (!orgLoading && (isError || (!orgLoading && org === null))) {
      navigate("/404");
    }
  }, [orgLoading, isError, org, navigate]);

  // Apply primary color as CSS variable
  useEffect(() => {
    if (org?.primary_color) {
      document.documentElement.style.setProperty("--org-primary", org.primary_color);
    }
    return () => {
      document.documentElement.style.removeProperty("--org-primary");
    };
  }, [org?.primary_color]);

  if (orgLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!org) return null;

  const primaryColor = org.primary_color || "#f97316";

  const handleVote = (id: string) => {
    if (votedIds.has(id) || voteMutation.isPending) return;
    voteMutation.mutate(id);
    const newVoted = new Set(votedIds).add(id);
    setVotedIds(newVoted);
    localStorage.setItem(`voted-${slug}`, JSON.stringify([...newVoted]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await addMutation.mutateAsync({ name: name.trim(), description: description.trim() });
    setName("");
    setDescription("");
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setShowForm(false);
    }, 2500);
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
            {org.logo_url ? (
              <img src={org.logo_url} alt={org.name} className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <span className="text-2xl">{org.emoji}</span>
            )}
            <p className="font-bold text-foreground text-sm leading-tight">{org.name}</p>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-24 pt-6">
        {/* Banner */}
        <div
          className="rounded-2xl p-5 mb-6 border"
          style={{
            backgroundColor: `${primaryColor}15`,
            borderColor: `${primaryColor}30`,
          }}
        >
          <p className="text-xl font-bold text-foreground mb-1">{org.description || `Bem-vindo ao ${org.name}!`}</p>
          <p className="text-muted-foreground text-sm">
            💡 Sugira um novo item e vote nos favoritos — as melhores ideias entram no cardápio!
          </p>
        </div>

        {/* Suggestions list */}
        <h2 className="font-bold text-foreground text-lg mb-4">
          💬 Sugestões da galera{" "}
          <span className="text-muted-foreground font-normal text-base">
            ({suggestionsLoading ? "..." : suggestions.length})
          </span>
        </h2>

        {suggestionsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : suggestions.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <p className="text-3xl mb-2">💡</p>
            <p className="font-semibold text-foreground">Nenhuma sugestão ainda</p>
            <p className="text-muted-foreground text-sm mt-1">Seja o primeiro a sugerir um item!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((s, index) => {
              const hasVoted = votedIds.has(s.id);
              return (
                <Card key={s.id} className="border border-border shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-foreground text-sm leading-snug">{s.name}</h3>
                          <Badge
                            className={`text-xs shrink-0 border ${STATUS_CLASS[s.status] ?? ""}`}
                            variant="outline"
                          >
                            {STATUS_LABEL[s.status] ?? s.status}
                          </Badge>
                        </div>
                        {s.description && (
                          <p className="text-muted-foreground text-xs leading-relaxed">{s.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={() => handleVote(s.id)}
                        disabled={hasVoted || voteMutation.isPending}
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
        )}
      </main>

      {/* Floating suggestion button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-50"
          style={{ backgroundColor: primaryColor }}
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Suggestion modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="font-bold text-foreground text-lg mb-4 flex items-center gap-2">
              <ChefHat className="w-5 h-5" style={{ color: primaryColor }} />
              Sugerir novo item
            </h2>

            {submitted ? (
              <div className="text-center py-6">
                <p className="text-4xl mb-3">🎉</p>
                <p className="font-semibold text-foreground text-lg">Sugestão enviada!</p>
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
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="sug-desc" className="text-sm font-medium">
                    Descrição <span className="text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <Textarea
                    id="sug-desc"
                    placeholder="Descreva os ingredientes, o que torna especial..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 resize-none"
                    rows={3}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={addMutation.isPending}
                  style={{ backgroundColor: primaryColor }}
                >
                  <Send className="w-4 h-4" />
                  {addMutation.isPending ? "Enviando..." : "Enviar sugestão"}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitPage;
