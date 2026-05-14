import { useEffect, useRef, useState } from "react";
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
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const firstGroupRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef<number | null>(null);
  const posRef = useRef(0);
  const dragStateRef = useRef<{ startX: number; startScroll: number; dragging: boolean; moved: boolean }>({
    startX: 0,
    startScroll: 0,
    dragging: false,
    moved: false,
  });

  useEffect(() => {
    (supabase.rpc as any)("get_top_stores_showcase").then(({ data }: any) => {
      setStores(Array.isArray(data) ? (data as Store[]) : []);
    });
  }, []);

  // Auto-scroll com requestAnimationFrame + loop infinito + drag livre
  useEffect(() => {
    if (!stores || stores.length < 3) return;
    const scroller = scrollerRef.current;
    const firstGroup = firstGroupRef.current;
    if (!scroller || !firstGroup) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SPEED = 0.6; // px por frame (~35px/s)
    let raf = 0;

    posRef.current = scroller.scrollLeft;

    const tick = () => {
      const groupWidth = firstGroup.offsetWidth;
      if (groupWidth > 0) {
        if (pausedRef.current || reduced) {
          // Sincroniza com o scroll real (drag/touch/wheel) para retomar suave
          posRef.current = scroller.scrollLeft;
        } else {
          posRef.current += SPEED;
          if (posRef.current >= groupWidth) posRef.current -= groupWidth;
          if (posRef.current < 0) posRef.current += groupWidth;
          scroller.scrollLeft = Math.round(posRef.current);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stores]);

  const pauseAutoScroll = (resumeAfterMs = 2000) => {
    pausedRef.current = true;
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    if (resumeAfterMs > 0) {
      resumeTimerRef.current = window.setTimeout(() => {
        pausedRef.current = false;
      }, resumeAfterMs);
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    pauseAutoScroll(0);
    dragStateRef.current = {
      startX: e.clientX,
      startScroll: scroller.scrollLeft,
      dragging: true,
      moved: false,
    };
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    const scroller = scrollerRef.current;
    if (!state.dragging || !scroller) return;
    const dx = e.clientX - state.startX;
    if (Math.abs(dx) > 4) state.moved = true;
    scroller.scrollLeft = state.startScroll - dx;
  };

  const endDrag = () => {
    dragStateRef.current.dragging = false;
    pauseAutoScroll(2000);
  };

  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    // Se o usuário arrastou, suprime o clique no card (evita abrir loja sem querer)
    if (dragStateRef.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragStateRef.current.moved = false;
    }
  };

  // Fallback enquanto carrega ou se ainda não há lojas suficientes no ranking
  if (stores === null) return null;
  if (stores.length < 3) return <MarqueeSocialProof />;

  // Loop infinito + drag livre via scroll nativo
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

      <div
        ref={scrollerRef}
        className="overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing select-none touch-pan-x"
        style={{ overscrollBehaviorX: "contain", WebkitOverflowScrolling: "touch" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        onMouseEnter={() => pauseAutoScroll(0)}
        onMouseLeave={() => pauseAutoScroll(1000)}
        onWheel={() => pauseAutoScroll(2000)}
        onTouchStart={() => pauseAutoScroll(0)}
        onTouchEnd={() => pauseAutoScroll(2000)}
        onClickCapture={onClickCapture}
      >
        <div className="flex whitespace-nowrap w-max">
          {[0, 1].map((groupIdx) => (
            <div
              key={groupIdx}
              ref={groupIdx === 0 ? firstGroupRef : undefined}
              className="flex gap-4 md:gap-6 shrink-0 mr-4 md:mr-6"
              aria-hidden={groupIdx === 1}
            >
            {stores.map((store) => (
              <a
                key={`${groupIdx}-${store.id}`}
                href={`/unidade/${store.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                draggable={false}
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
                      draggable={false}
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
      </div>
    </section>
  );
}
