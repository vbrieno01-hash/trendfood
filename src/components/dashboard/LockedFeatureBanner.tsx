import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LockedFeatureBannerProps {
  /** Variant changes the visual treatment */
  variant?: "expired" | "free" | "warning";
  /** Title shown in bold */
  title: string;
  /** Body text explaining the situation */
  description: string;
  /** Optional callback when user clicks the CTA */
  onUpgrade?: () => void;
  /** CTA label, defaults to "Renovar agora" */
  ctaLabel?: string;
}

/**
 * Banner shown above paid feature tabs when the organization is on the Free plan
 * (either trial expired or never subscribed). Communicates that data is preserved
 * but new actions are blocked, and offers a clear path to renew/upgrade.
 */
export default function LockedFeatureBanner({
  variant = "expired",
  title,
  description,
  onUpgrade,
  ctaLabel = "Renovar agora",
}: LockedFeatureBannerProps) {
  const styles = {
    expired: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    free: "border-primary/40 bg-primary/10 text-primary",
    warning: "border-destructive/40 bg-destructive/10 text-destructive",
  }[variant];

  const iconBg = {
    expired: "bg-gradient-to-br from-amber-500 to-orange-600 text-white",
    free: "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground",
    warning: "bg-gradient-to-br from-red-500 to-red-600 text-white",
  }[variant];

  return (
    <div
      className={`dashboard-glass rounded-2xl p-4 border-2 ${styles} flex items-start gap-3 animate-dashboard-fade-in`}
    >
      <div className={`p-2 rounded-xl flex-shrink-0 ${iconBg}`}>
        <Lock className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      {onUpgrade && (
        <Button size="sm" onClick={onUpgrade} className="flex-shrink-0 shadow-lg">
          {ctaLabel}
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      )}
    </div>
  );
}
