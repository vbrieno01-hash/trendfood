import { useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReviews, useDeleteReview, useReviewStats } from "@/hooks/useReviews";
import { toast } from "sonner";

interface ReviewsTabProps {
  orgId: string;
}

const ReviewsTab = ({ orgId }: ReviewsTabProps) => {
  const { data: reviews = [], isLoading } = useReviews(orgId);
  const stats = useReviewStats(orgId);
  const deleteReview = useDeleteReview();
  const [filterRating, setFilterRating] = useState<number | null>(null);

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
          <p className="text-4xl mb-3">📝</p>
          <p className="font-semibold text-foreground">Nenhuma avaliação ainda</p>
          <p className="text-sm text-muted-foreground mt-1">Quando seus clientes avaliarem pedidos, as avaliações aparecerão aqui.</p>
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
