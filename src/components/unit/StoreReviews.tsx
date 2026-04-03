import { useState } from "react";
import { Star, ChevronDown, ChevronUp } from "lucide-react";
import { useReviews, useReviewStats } from "@/hooks/useReviews";

interface StoreReviewsProps {
  orgId: string;
  primaryColor: string;
}

const StoreReviews = ({ orgId, primaryColor }: StoreReviewsProps) => {
  const { data: reviews = [] } = useReviews(orgId);
  const stats = useReviewStats(orgId);
  const [expanded, setExpanded] = useState(false);

  if (stats.count === 0) return null;

  const displayReviews = expanded ? reviews.slice(0, 20) : reviews.slice(0, 3);

  return (
    <div className="mb-5">
      {/* Summary */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between bg-card border border-border/50 rounded-2xl px-4 py-3 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className="w-4 h-4"
                fill={s <= Math.round(stats.avg) ? "#facc15" : "none"}
                stroke={s <= Math.round(stats.avg) ? "#facc15" : "currentColor"}
              />
            ))}
          </div>
          <span className="text-sm font-semibold text-foreground">{stats.avg.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">({stats.count} {stats.count === 1 ? "avaliação" : "avaliações"})</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {/* Reviews list */}
      {expanded && displayReviews.length > 0 && (
        <div className="mt-2 space-y-2">
          {displayReviews.map((review) => (
            <div key={review.id} className="bg-card border border-border/30 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className="w-3 h-3"
                      fill={s <= review.rating ? "#facc15" : "none"}
                      stroke={s <= review.rating ? "#facc15" : "currentColor"}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(review.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StoreReviews;
