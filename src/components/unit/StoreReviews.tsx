import { Star } from "lucide-react";
import { useReviewStats } from "@/hooks/useReviews";

interface StoreReviewsProps {
  orgId: string;
  primaryColor: string;
}

const StoreReviews = ({ orgId }: StoreReviewsProps) => {
  const stats = useReviewStats(orgId);

  if (stats.count === 0) return null;

  return (
    <div className="mb-5 flex justify-center">
      <div className="flex items-center gap-2 bg-card border border-border/50 rounded-full px-4 py-2 shadow-sm">
        <span className="text-xs font-medium text-muted-foreground">Avaliações</span>
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
        <span className="text-xs text-muted-foreground">({stats.count})</span>
      </div>
    </div>
  );
};

export default StoreReviews;
