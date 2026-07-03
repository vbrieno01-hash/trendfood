import { useState, useEffect } from "react";
import { Star, Trash2, Copy, Share2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useReviews, useDeleteReview, useReviewStats } from "@/hooks/useReviews";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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

  const shareUrl = orgMeta?.slug ? `${window.location.origin}/unidade/${orgMeta.slug}` : "";
  const shareText = orgMeta?.slug
    ? `Olá! 🌟 Faça seu pedido e depois deixe sua avaliação sobre nossa loja: ${shareUrl}`
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
      <div>
        <h2 className="text-xl font-bold text-foreground">⭐ Avaliações dos Clientes</h2>
        <p className="text-sm text-muted-foreground mt-1">Veja o que seus clientes estão dizendo sobre sua loja.</p>
      </div>

      {/* Config: toggle + share link */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
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
      </div>

      {/* Stats card */}
      <div className="bg-card border border-border rounded-2xl p-5">
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
      </div>

      {/* Reviews list */}
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center">
          <div className="relative mx-auto w-24 h-24 mb-3">
            <div className="animate-[float_3s_ease-in-out_infinite]">
              <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-24 h-24">
                <circle cx="60" cy="60" r="50" fill="url(#noteGlow)" className="animate-[pulse_3s_ease-in-out_infinite]" />
                <rect x="35" y="25" width="50" height="65" rx="6" fill="hsl(var(--primary))" opacity="0.15" />
                <rect x="38" y="28" width="44" height="59" rx="4" fill="hsl(var(--primary))" opacity="0.25" />
                <line x1="46" y1="42" x2="74" y2="42" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
                <line x1="46" y1="52" x2="70" y2="52" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
                <line x1="46" y1="62" x2="66" y2="62" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
                <g className="animate-[penWrite_2.5s_ease-in-out_infinite]" style={{transformOrigin: '78px 72px'}}>
                  <line x1="78" y1="55" x2="78" y2="80" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
                  <polygon points="78,82 75,88 81,88" fill="hsl(var(--primary))" />
                </g>
                <circle cx="92" cy="32" r="2" fill="#facc15" className="animate-[sparkle_2s_ease-in-out_infinite]" />
                <circle cx="28" cy="50" r="1.5" fill="#facc15" className="animate-[sparkle_2s_ease-in-out_0.7s_infinite]" />
                <defs>
                  <radialGradient id="noteGlow" cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
          </div>
          <p className="font-semibold text-foreground">Nenhuma avaliação ainda</p>
          <p className="text-sm text-muted-foreground mt-1">Quando seus clientes avaliarem pedidos, as avaliações aparecerão aqui.</p>
          <style>{`
            @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
            @keyframes penWrite { 0%, 100% { transform: translateY(0) rotate(0deg); } 25% { transform: translateY(-3px) rotate(-5deg); } 50% { transform: translateY(0) rotate(0deg); } 75% { transform: translateY(-2px) rotate(3deg); } }
            @keyframes sparkle { 0%, 100% { opacity: 0; transform: scale(0.5); } 50% { opacity: 1; transform: scale(1.3); } }
          `}</style>
        </div>
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
