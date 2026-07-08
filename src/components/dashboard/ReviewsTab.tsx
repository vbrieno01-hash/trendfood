import { useState, useEffect } from "react";
import { Star, Trash2, Copy, Share2, Link as LinkIcon, MessageSquareQuote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useReviews, useDeleteReview, useReviewStats } from "@/hooks/useReviews";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CommandHeader, CommandPanel, CommandEmpty } from "@/components/dashboard/command";

interface ReviewsTabProps {
  orgId: string;
}

const ReviewsTab = ({ orgId }: ReviewsTabProps) => {
  const { data: reviews = [], isLoading } = useReviews(orgId);
  const stats = useReviewStats(orgId);
  const deleteReview = useDeleteReview();
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const qc = useQueryClient();

  const { data: orgMeta } = useQuery({
    queryKey: ["org-reviews-meta", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("slug, reviews_enabled")
        .eq("id", orgId)
        .maybeSingle();
      if (error) throw error;
      return data as { slug: string; reviews_enabled: boolean } | null;
    },
    enabled: !!orgId,
  });

  const [enabled, setEnabled] = useState<boolean>(true);
  useEffect(() => {
    if (orgMeta) setEnabled(!!orgMeta.reviews_enabled);
  }, [orgMeta?.reviews_enabled]);

  const toggleEnabled = useMutation({
    mutationFn: async (next: boolean) => {
      const { error } = await supabase
        .from("organizations")
        .update({ reviews_enabled: next })
        .eq("id", orgId);
      if (error) throw error;
    },
    onMutate: (next) => setEnabled(next),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-reviews-meta", orgId] });
      toast.success("Preferência salva");
    },
    onError: (_e, next) => {
      setEnabled(!next);
      toast.error("Não foi possível salvar");
    },
  });

  const shareUrl = orgMeta?.slug ? `https://trendfood.site/avaliar/${orgMeta.slug}` : "";
  const shareText = orgMeta?.slug
    ? `Olá! 🌟 Adoraríamos saber sua opinião. Deixe sua avaliação aqui: ${shareUrl}`
    : "";

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const shareWhatsApp = () => {
    if (!shareText) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const filtered = filterRating ? reviews.filter((r) => r.rating === filterRating) : reviews;

  const handleDelete = async (id: string) => {
    try {
      await deleteReview.mutateAsync(id);
      toast.success("Avaliação removida");
    } catch {
      toast.error("Erro ao remover avaliação");
    }
  };

  return (
    <div className="space-y-6">
      <CommandHeader
        eyebrow="Reputação"
        title="Avaliações dos Clientes"
        subtitle="Veja o que seus clientes estão dizendo sobre sua loja."
        icon={<Star className="w-5 h-5" />}
      />

      {/* Config: toggle + share link */}
      <CommandPanel eyebrow="Coleta" title="Link de avaliação" className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground">Coletar avaliações</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Quando ativado, o link de avaliação é enviado nas mensagens automáticas do WhatsApp após a entrega.
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(v) => toggleEnabled.mutate(v)}
            disabled={toggleEnabled.isPending || !orgMeta}
          />
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-sm font-medium text-foreground flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-primary" /> Link da sua loja
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Compartilhe com seus clientes. Após finalizarem um pedido, eles poderão avaliar.
          </p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <code className="flex-1 min-w-[220px] px-3 py-2 rounded-lg bg-muted text-xs text-foreground break-all">
              {shareUrl || "Carregando..."}
            </code>
            <Button size="sm" variant="outline" onClick={copyLink} disabled={!shareUrl}>
              <Copy className="w-4 h-4 mr-1.5" /> Copiar
            </Button>
            <Button size="sm" onClick={shareWhatsApp} disabled={!shareUrl}>
              <Share2 className="w-4 h-4 mr-1.5" /> WhatsApp
            </Button>
          </div>
        </div>
      </CommandPanel>

      {/* Stats card */}
      <CommandPanel eyebrow="Ranking" title="Distribuição de notas">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-center">
            <p className="text-4xl font-bold text-foreground">{stats.count > 0 ? stats.avg.toFixed(1) : "—"}</p>
            <div className="flex gap-0.5 justify-center mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-4 h-4" fill={s <= Math.round(stats.avg) ? "#facc15" : "none"} stroke={s <= Math.round(stats.avg) ? "#facc15" : "currentColor"} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stats.count} {stats.count === 1 ? "avaliação" : "avaliações"}</p>
          </div>

          {/* Distribution */}
          <div className="flex-1 min-w-[200px] space-y-1">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.distribution[star - 1];
              const pct = stats.count > 0 ? (count / stats.count) * 100 : 0;
              return (
                <button
                  key={star}
                  onClick={() => setFilterRating(filterRating === star ? null : star)}
                  className={`flex items-center gap-2 w-full text-left group ${filterRating === star ? "opacity-100" : "opacity-70 hover:opacity-100"}`}
                >
                  <span className="text-xs w-8 text-right font-medium text-muted-foreground">{star}★</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs w-6 text-muted-foreground">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
        {filterRating && (
          <p className="text-xs text-muted-foreground mt-3">
            Filtrando por {filterRating}★ · <button onClick={() => setFilterRating(null)} className="underline">Limpar filtro</button>
          </p>
        )}
      </CommandPanel>

      {/* Reviews list */}
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : filtered.length === 0 ? (
        <CommandEmpty
          icon={<MessageSquareQuote className="w-6 h-6" />}
          title="Nenhuma avaliação ainda"
          description="Quando seus clientes avaliarem pedidos, as avaliações aparecerão aqui."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((review) => (
            <div key={review.id} className="bg-card border border-border/50 rounded-xl p-4 flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-3.5 h-3.5" fill={s <= review.rating ? "#facc15" : "none"} stroke={s <= review.rating ? "#facc15" : "currentColor"} />
                    ))}
                  </div>
                  {review.customer_name && <span className="text-sm font-medium text-foreground">{review.customer_name}</span>}
                  <span className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
                {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(review.id)}
                disabled={deleteReview.isPending}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewsTab;
