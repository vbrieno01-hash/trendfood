import { useEffect, useMemo, useState } from "react";
import { Wallet, Bell, Sparkles, BarChart3, X, ArrowRight, Sparkle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_UPDATES, type AppUpdate } from "@/config/updates";

const DISMISS_PREFIX = "updateBannerDismissed:";
const AUTO_DISMISS_MS = 3 * 60 * 1000;

const ICON_MAP = {
  wallet: Wallet,
  bell: Bell,
  sparkles: Sparkles,
  chart: BarChart3,
} as const;

function isDismissed(id: string): boolean {
  try {
    return localStorage.getItem(DISMISS_PREFIX + id) === "1";
  } catch {
    return false;
  }
}

function markDismissed(id: string) {
  try {
    localStorage.setItem(DISMISS_PREFIX + id, "1");
  } catch {
    /* ignore */
  }
}

function pickActiveUpdate(): AppUpdate | null {
  const now = Date.now();
  const candidates = APP_UPDATES.filter((u) => {
    const expires = new Date(u.expiresAt).getTime();
    if (Number.isNaN(expires) || expires < now) return false;
    return !isDismissed(u.id);
  }).sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  return candidates[0] ?? null;
}

/** Renders **bold** markdown inline. */
function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

interface UpdateBannerProps {
  onNavigate?: (tab: string) => void;
}

export default function UpdateBanner({ onNavigate }: UpdateBannerProps) {
  const [update, setUpdate] = useState<AppUpdate | null>(() => pickActiveUpdate());
  const [leaving, setLeaving] = useState(false);

  const Icon = useMemo(() => {
    if (!update?.icon) return Wallet;
    return ICON_MAP[update.icon] ?? Wallet;
  }, [update]);

  useEffect(() => {
    if (!update) return;

    let remaining = AUTO_DISMISS_MS;
    let startedAt = Date.now();
    let timerId: number | null = null;

    const finish = () => {
      markDismissed(update.id);
      setLeaving(true);
      window.setTimeout(() => setUpdate(null), 320);
    };

    const start = () => {
      startedAt = Date.now();
      timerId = window.setTimeout(finish, remaining);
    };

    const pause = () => {
      if (timerId !== null) {
        window.clearTimeout(timerId);
        timerId = null;
        remaining -= Date.now() - startedAt;
        if (remaining < 0) remaining = 0;
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        pause();
      } else if (timerId === null && remaining > 0) {
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [update]);

  if (!update) return null;

  const handleClose = () => {
    markDismissed(update.id);
    setLeaving(true);
    window.setTimeout(() => setUpdate(null), 320);
  };

  const handleCta = () => {
    if (update.ctaTab && onNavigate) onNavigate(update.ctaTab);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5 md:p-6 backdrop-blur-xl shadow-lg transition-all duration-300 ${
        leaving ? "opacity-0 -translate-y-2" : "opacity-100 translate-y-0"
      }`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.25),transparent_60%)]"
      />
      <button
        type="button"
        onClick={handleClose}
        aria-label="Fechar aviso"
        className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-muted-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary ring-1 ring-primary/30">
            <Icon className="h-6 w-6" />
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/30">
              <Sparkle className="h-3 w-3" />
              Novidade
            </div>
            <h3 className="text-lg md:text-xl font-bold text-foreground leading-tight pr-8">
              {update.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {renderInline(update.description)}
            </p>
            {update.chips && update.chips.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {update.chips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-background/40 px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {update.ctaLabel && update.ctaTab && onNavigate && (
          <div className="flex md:justify-end md:pl-4">
            <Button
              onClick={handleCta}
              size="lg"
              className="w-full md:w-auto gap-2 shadow-md"
            >
              {update.ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}