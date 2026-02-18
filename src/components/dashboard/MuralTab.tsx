import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSuggestions, useUpdateSuggestion, useDeleteSuggestion, Suggestion } from "@/hooks/useSuggestions";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Heart, Trash2, Pencil, Check, X, Search, UtensilsCrossed, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Status badge config ──────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending:   { label: "⏳ Pendente",    className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  analyzing: { label: "🔍 Analisando", className: "bg-blue-100 text-blue-800 border-blue-300" },
  on_menu:   { label: "✅ No Cardápio", className: "bg-green-100 text-green-800 border-green-300" },
};

// ─── Quick action buttons per status ─────────────────────────────────────────
type QuickAction = { label: string; toStatus: string; icon: React.ReactNode; variant: "outline" | "secondary" | "default" };

const QUICK_ACTIONS: Record<string, QuickAction[]> = {
  pending: [
    { label: "Mover para Analisando", toStatus: "analyzing", icon: <Search className="w-3.5 h-3.5" />, variant: "outline" },
    { label: "Aprovar para o Cardápio", toStatus: "on_menu",   icon: <UtensilsCrossed className="w-3.5 h-3.5" />, variant: "default" },
  ],
  analyzing: [
    { label: "Voltar para Pendente",   toStatus: "pending",   icon: <Clock className="w-3.5 h-3.5" />, variant: "outline" },
    { label: "Aprovar para o Cardápio", toStatus: "on_menu",  icon: <UtensilsCrossed className="w-3.5 h-3.5" />, variant: "default" },
  ],
  on_menu: [
    { label: "Voltar para Pendente",   toStatus: "pending",   icon: <Clock className="w-3.5 h-3.5" />, variant: "outline" },
    { label: "Mover para Analisando",  toStatus: "analyzing", icon: <Search className="w-3.5 h-3.5" />, variant: "outline" },
  ],
};

const FILTER_OPTIONS = [
  { value: "all",       label: "Todas" },
  { value: "pending",   label: "Pendentes" },
  { value: "analyzing", label: "Analisando" },
  { value: "on_menu",   label: "No Cardápio" },
];

interface Organization {
  id: string;
  name: string;
  slug: string;
}

// ─── SuggestionCard ───────────────────────────────────────────────────────────
function SuggestionCard({
  s,
  updateMutation,
  deleteMutation,
}: {
  s: Suggestion;
  updateMutation: ReturnType<typeof useUpdateSuggestion>;
  deleteMutation: ReturnType<typeof useDeleteSuggestion>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const badge = STATUS_BADGE[s.status] ?? STATUS_BADGE.pending;
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
    <Card className="border border-border shadow-sm">
      <CardContent className="p-4 space-y-3">
        {/* Row 1: name + meta actions */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {editingId === s.id ? (
              <div className="space-y-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8 text-sm font-semibold"
                />
                <Input
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Descrição (opcional)"
                  className="h-8 text-xs"
                />
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
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="flex items-center gap-1 text-sm font-bold text-red-500 mr-1">
              <Heart className="w-3.5 h-3.5 fill-red-500" />
              {s.votes}
            </span>
            {editingId !== s.id && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={startEdit}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza que deseja excluir?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A sugestão <strong>"{s.name}"</strong> será excluída permanentemente. Esta ação não pode ser desfeita.
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

        {/* Row 2: status badge */}
        {editingId !== s.id && (
          <div>
            <span className={cn("inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full border", badge.className)}>
              {badge.label}
            </span>
          </div>
        )}

        {/* Row 3: quick action buttons */}
        {editingId !== s.id && actions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
            {actions.map((action) => (
              <Button
                key={action.toStatus}
                size="sm"
                variant={action.variant}
                disabled={updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate(
                    { id: s.id, status: action.toStatus },
                  )
                }
                className="h-7 text-xs gap-1.5"
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── MuralTab ─────────────────────────────────────────────────────────────────
export default function MuralTab({ organization }: { organization: Organization }) {
  const queryClient = useQueryClient();
  const { data: suggestions = [], isLoading } = useSuggestions(organization.id);
  const updateMutation = useUpdateSuggestion(organization.id, "Status atualizado com sucesso! ✅");
  const deleteMutation = useDeleteSuggestion(organization.id);

  const [filter, setFilter] = useState("all");

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`suggestions-${organization.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "suggestions",
          filter: `organization_id=eq.${organization.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["suggestions", organization.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization.id, queryClient]);

  const filtered = filter === "all"
    ? suggestions
    : suggestions.filter((s) => s.status === filter);

  if (isLoading) {
    return (
      <div className="space-y-3 max-w-3xl">
        <Skeleton className="h-10 w-full rounded-lg" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gerenciar Mural</h1>
          <p className="text-muted-foreground text-sm">{suggestions.length} sugestão(ões) no total</p>
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
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-3xl mb-2">🗒️</p>
          <p className="font-medium text-foreground">Nenhuma sugestão aqui</p>
          <p className="text-muted-foreground text-sm mt-1">
            {filter === "all"
              ? "Compartilhe o link da sua lanchonete para receber sugestões!"
              : "Nenhuma sugestão com este status."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <SuggestionCard
              key={s.id}
              s={s}
              updateMutation={updateMutation}
              deleteMutation={deleteMutation}
            />
          ))}
        </div>
      )}
    </div>
  );
}
