import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import MarqueeSocialProof from "./MarqueeSocialProof";
import { Sparkles } from "lucide-react";

interface Store {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  order_count_30d: number;
}

export default function TopStoresMarquee() {
  const [stores, setStores] = useState<Store[] | null>(null);

  useEffect(() => {
    (supabase.rpc as any)("get_top_stores_showcase").then(({ data }: any) => {
      setStores(Array.isArray(data) ? (data as Store[]) : []);
    });
  }, []);

  // Fallback enquanto carrega ou se ainda não há lojas suficientes no ranking
  if (stores === null) return null;
  if (stores.length < 3) return <MarqueeSocialProof />;

  // Loop infinito sem salto: dois grupos idênticos + translate -50%
  return (
    <section className="relative py-10 bg-background border-y border-border/60 overflow-hidden">
      <div className="text-center mb-6 px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wide uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          Lojas em destaque agora
        </div>
        <p className="text-muted-foreground text-sm mt-2">
          Negócios reais vendendo todo dia no TrendFood
        </p>
      </div>

      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-32 z-10"
        style={{ background: "linear-gradient(to right, hsl(var(--background)), transparent)" }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-32 z-10"
        style={{ background: "linear-gradient(to left, hsl(var(--background)), transparent)" }}
      />

      <div className="flex landing-marquee-track whitespace-nowrap will-change-transform hover:[animation-play-state:paused]">
        {[0, 1].map((groupIdx) => (
          <div key={groupIdx} className="flex gap-4 md:gap-6 shrink-0 mr-4 md:mr-6" aria-hidden={groupIdx === 1}>
            {stores.map((store) => (
              <a
                key={`${groupIdx}-${store.id}`}
                href={`/unidade/${store.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 shrink-0 px-5 py-3 rounded-3xl bg-card border border-border/60 hover:border-primary/40 hover:shadow-md transition-all"
                title={`${store.name} — ${store.order_count_30d} pedidos nos últimos 30 dias`}
              >
                <div
                  className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden bg-muted shrink-0 ring-2 ring-transparent group-hover:ring-primary/30 transition-all"
                  style={store.primary_color ? { backgroundColor: store.primary_color } : undefined}
                >
                  {store.logo_url && (
                    <img
                      src={store.logo_url}
                      alt={store.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <span className="text-base md:text-lg font-bold text-foreground max-w-[200px] truncate">
                  {store.name}
                </span>
              </a>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
