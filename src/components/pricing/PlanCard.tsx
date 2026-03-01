import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PlanCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  ctaLink: string;
  external?: boolean;
  highlighted?: boolean;
  badge?: string;
  onSelect?: () => void;
  loading?: boolean;
  currentPlan?: boolean;
  subtitle?: string;
  savingsBadge?: string;
}

const PlanCard = ({
  name,
  price,
  period = "/mês",
  description,
  features,
  cta,
  ctaLink,
  external,
  highlighted,
  badge,
  onSelect,
  loading,
  currentPlan,
  subtitle,
  savingsBadge,
}: PlanCardProps) => {
  return (
    <div
      className={cn(
        "relative rounded-2xl border p-6 md:p-8 flex flex-col h-full transition-all",
        highlighted
          ? "border-primary bg-card shadow-xl shadow-primary/10 scale-[1.02] md:scale-105"
          : "border-border bg-card shadow-sm hover:border-primary/30 hover:shadow-md",
        currentPlan && "ring-2 ring-primary"
      )}
    >
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
          {badge}
        </span>
      )}
      {currentPlan && (
        <span className="absolute -top-3 right-4 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
          Seu plano
        </span>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-bold text-foreground mb-1">{name}</h3>
        <p className="text-muted-foreground text-sm mb-4">{description}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-extrabold text-foreground">{price}</span>
          {price !== "Grátis" && (
            <span className="text-muted-foreground text-sm">{period}</span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {savingsBadge && (
          <span className="inline-block mt-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-2.5 py-0.5 rounded-full">
            {savingsBadge}
          </span>
        )}
      </div>

      <ul className="space-y-3 flex-1 mb-8">
        {features.map((f) => {
          const isComingSoon = f.includes("(em breve)");
          const label = isComingSoon ? f.replace(" (em breve)", "") : f;
          return (
            <li key={f} className="flex items-start gap-2 text-sm text-foreground">
              {isComingSoon ? (
                <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              ) : (
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              )}
              <span className={isComingSoon ? "text-muted-foreground" : ""}>
                {label}
              </span>
              {isComingSoon && (
                <span className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap">
                  Em breve
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {currentPlan ? (
        <Button
          size="lg"
          variant={highlighted ? "default" : "outline"}
          className="w-full font-bold opacity-60"
          disabled
        >
          Plano atual
        </Button>
      ) : onSelect ? (
        <Button
          size="lg"
          variant={highlighted ? "default" : "outline"}
          className="w-full font-bold"
          onClick={onSelect}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          {cta}
        </Button>
      ) : external ? (
        <a
          href={ctaLink}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center justify-center rounded-md text-sm font-bold h-11 px-8 w-full transition-colors",
            highlighted
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
          )}
        >
          {cta}
        </a>
      ) : (
        <Button
          size="lg"
          variant={highlighted ? "default" : "outline"}
          className="w-full font-bold"
          asChild
        >
          <Link to={ctaLink}>{cta}</Link>
        </Button>
      )}
    </div>
  );
};

export default PlanCard;
