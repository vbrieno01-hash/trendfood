import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSuggestions, useUpdateSuggestion, useDeleteSuggestion, Suggestion } from "@/hooks/useSuggestions";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Heart, Trash2, Pencil, Check, X, Search, UtensilsCrossed,
  Clock, MessageSquareDashed,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Status config sem emojis ─────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  pending:   { label: "Pendente",    dot: "bg-amber-400",  badge: "bg-amber-50 text-amber-700 border-amber-200" },
  analyzing: { label: "Analisando", dot: "bg-blue-400",   badge: "bg-blue-50 text-blue-700 border-blue-200" },
  on_menu:   { label: "No Cardápio", dot: "bg-green-400",  badge: "bg-green-50 text-green-700 border-green-200" },
};

type QuickAction = { label: string; toStatus: string; icon: React.ReactNode; variant: "outline" | "secondary" | "default" };

const QUICK_ACTIONS: Record<string, QuickAction[]> = {
  pending: [
    { label: "Mover para Analisando",  toStatus: "analyzing", icon: <Search className="w-3.5 h-3.5" />,        variant: "outline" },
    { label: "Aprovar para o Cardápio", toStatus: "on_menu",   icon: <UtensilsCrossed className="w-3.5 h-3.5" />, variant: "default" },
  ],
  analyzing: [
    { label: "Voltar para Pendente",    toStatus: "pending",   icon: <Clock className="w-3.5 h-3.5" />,          variant: "outline" },
    { label: "Aprovar para o Cardápio", toStatus: "on_menu",   icon: <UtensilsCrossed className="w-3.5 h-3.5" />, variant: "default" },
  ],
  on_menu: [
    { label: "Voltar para Pendente",    toStatus: "pending",   icon: <Clock className="w-3.5 h-3.5" />,          variant: "outline" },
    { label: "Mover para Analisando",   toStatus: "analyzing", icon: <Search className="w-3.5 h-3.5" />,         variant: "outline" },
  ],
};

const FILTER_OPTIONS = [
  { value: "all",       label: "Todas" },
  { value: "pending",   label: "Pendentes" },
  { value: "analyzing", label: "Analisando" },
  { value: "on_menu",   label: "No Cardápio" },
];

interface Organization { id: string; name: string; slug: string }

// ─── SuggestionCard ───────────────────────────────────────────────────────────
function SuggestionCard({
  s, updateMutation, deleteMutation,
}: {
  s: Suggestion;
  updateMutation: ReturnType<typeof useUpdateSuggestion>;
  deleteMutation: ReturnType<typeof useDeleteSuggestion>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.pending;
  const actions = QUICK_ACTIONS[s.status] ?? [];

  const startEdit = () => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditDesc(s.description ?? "");
  };

  const saveEdit = () => {
    updateMutation.mutate({ id: s.id, name: editName, description: editDesc });
    setEditingId(null);
  };

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div className="px-4 py-3 space-y-2.5">
        {/* Row 1: name + meta */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {editingId === s.id ? (
              <div className="space-y-2">
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-sm font-semibold" />
                <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Descrição (opcional)" className="h-8 text-xs" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEdit} className="h-7 gap-1">
                    <Check className="w-3 h-3" /> Salvar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 gap-1">
                    <X className="w-3 h-3" /> Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="font-semibold text-foreground text-sm leading-snug">{s.name}</p>
                {s.description && (
                  <p className="text-muted-foreground text-xs leading-relaxed mt-0.5">{s.description}</p>
                )}
              </>
            )}
          </div>

          {/* Votes + edit + delete */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="flex items-center gap-1 text-sm font-bold text-red-500 mr-1">
              <Heart className="w-3.5 h-3.5 fill-red-500" />
              {s.votes}
            </span>
            {editingId !== s.id && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={startEdit}>
                <Pencil className="w-3 h-3" />
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir sugestão?</AlertDialogTitle>
                  <AlertDialogDescription>
                    <strong>"{s.name}"</strong> será excluída permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate(s.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Status badge — sem emoji, com ponto colorido */}
        {editingId !== s.id && (
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border", cfg.badge)}>
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
              {cfg.label}
            </span>
          </div>
        )}

        {/* Quick actions */}
        {editingId !== s.id && actions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            {actions.map((action) => (
              <Button
                key={action.toStatus}
                size="sm"
                variant={action.variant}
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate({ id: s.id, status: action.toStatus })}
                className="h-7 text-xs gap-1.5"
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MuralTab ─────────────────────────────────────────────────────────────────
export default function MuralTab({ organization }: { organization: Organization }) {
  const queryClient = useQueryClient();
  const { data: suggestions = [], isLoading } = useSuggestions(organization.id);
  const updateMutation = useUpdateSuggestion(organization.id, "Status atualizado!");
  const deleteMutation = useDeleteSuggestion(organization.id);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const channel = supabase
      .channel(`suggestions-${organization.id}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "suggestions",
        filter: `organization_id=eq.${organization.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["suggestions", organization.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [organization.id, queryClient]);

  const filtered = filter === "all" ? suggestions : suggestions.filter((s) => s.status === filter);

  if (isLoading) {
    return (
      <div className="space-y-2 max-w-3xl">
        <Skeleton className="h-10 w-full rounded-lg" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gerenciar Mural</h1>
          <p className="text-muted-foreground text-sm">{suggestions.length} {suggestions.length === 1 ? "sugestão" : "sugestões"} no total</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center">
          <MessageSquareDashed className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-semibold text-foreground text-sm">Nenhuma sugestão aqui</p>
          <p className="text-muted-foreground text-xs mt-1">
            {filter === "all"
              ? "Compartilhe o link da sua lanchonete para receber sugestões!"
              : "Nenhuma sugestão com este status."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <SuggestionCard key={s.id} s={s} updateMutation={updateMutation} deleteMutation={deleteMutation} />
          ))}
        </div>
      )}
    </div>
  );
}
