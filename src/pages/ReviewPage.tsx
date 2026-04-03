import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/hooks/useOrganization";
import { useReviewByOrder, useSubmitReview } from "@/hooks/useReviews";
import { toast } from "sonner";

const ReviewPage = () => {
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>();
  const { data: org, isLoading: orgLoading } = useOrganization(slug);
  const { data: existingReview, isLoading: reviewLoading } = useReviewByOrder(orderId);
  const submitReview = useSubmitReview();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isLoading = orgLoading || reviewLoading;

  const handleSubmit = async () => {
    if (!org || !orderId || rating === 0) {
      toast.error("Selecione uma nota de 1 a 5 estrelas");
      return;
    }
    try {
      await submitReview.mutateAsync({
        organization_id: org.id,
        order_id: orderId,
        rating,
        comment: comment.trim() || undefined,
        customer_name: customerName.trim() || undefined,
      });
      setSubmitted(true);
      toast.success("Avaliação enviada! Obrigado 🎉");
    } catch (err: any) {
      if (err?.message?.includes("duplicate") || err?.code === "23505") {
        toast.error("Você já avaliou este pedido");
      } else {
        toast.error("Erro ao enviar avaliação. Tente novamente.");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-72">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-semibold text-foreground">Loja não encontrada</p>
        </div>
      </div>
    );
  }

  const primaryColor = org.primary_color || "#f97316";

  // Already reviewed
  if (existingReview || submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">✅</p>
          <h1 className="font-bold text-xl text-foreground mb-2">Avaliação enviada!</h1>
          <p className="text-muted-foreground text-sm mb-1">
            Obrigado por avaliar o <strong>{org.name}</strong>.
          </p>
          {(existingReview || submitted) && (
            <div className="flex justify-center gap-1 my-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className="w-6 h-6"
                  fill={s <= (existingReview?.rating ?? rating) ? "#facc15" : "none"}
                  stroke={s <= (existingReview?.rating ?? rating) ? "#facc15" : "currentColor"}
                />
              ))}
            </div>
          )}
          <Link
            to={`/unidade/${slug}`}
            className="inline-flex items-center gap-2 text-sm font-medium mt-2"
            style={{ color: primaryColor }}
          >
            ← Voltar para a loja
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Store header */}
        <div className="text-center mb-8">
          {org.logo_url ? (
            <img src={org.logo_url} alt={org.name} className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3" />
          ) : (
            <p className="text-4xl mb-3">{org.emoji}</p>
          )}
          <h1 className="font-bold text-xl text-foreground">{org.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">Como foi sua experiência?</p>
        </div>

        {/* Star rating */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onMouseEnter={() => setHoverRating(s)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(s)}
              className="transition-transform hover:scale-110 active:scale-95"
            >
              <Star
                className="w-10 h-10 transition-colors"
                fill={s <= (hoverRating || rating) ? "#facc15" : "none"}
                stroke={s <= (hoverRating || rating) ? "#facc15" : "currentColor"}
              />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-center text-sm text-muted-foreground mb-6">
            {rating === 1 && "Muito ruim 😞"}
            {rating === 2 && "Ruim 😕"}
            {rating === 3 && "Regular 😐"}
            {rating === 4 && "Bom 😊"}
            {rating === 5 && "Excelente! 🤩"}
          </p>
        )}

        {/* Name */}
        <div className="space-y-2 mb-4">
          <Label htmlFor="name">Seu nome (opcional)</Label>
          <Input
            id="name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Como quer ser identificado?"
            maxLength={60}
          />
        </div>

        {/* Comment */}
        <div className="space-y-2 mb-6">
          <Label htmlFor="comment">Comentário (opcional)</Label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Conte como foi seu pedido..."
            maxLength={500}
            rows={3}
          />
        </div>

        {/* Submit */}
        <Button
          className="w-full h-12 text-base font-semibold rounded-xl text-white"
          style={{ backgroundColor: primaryColor }}
          disabled={rating === 0 || submitReview.isPending}
          onClick={handleSubmit}
        >
          {submitReview.isPending ? "Enviando..." : "Enviar Avaliação ⭐"}
        </Button>

        <div className="text-center mt-6">
          <Link
            to={`/unidade/${slug}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Voltar para a loja
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;
