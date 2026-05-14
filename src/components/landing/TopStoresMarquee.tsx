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
  const trackRef = useRef<HTMLDivElement | null>(null);
  const firstGroupRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef(0);
  const pausedUntilRef = useRef(0);
  const draggingRef = useRef(false);
  const dragRef = useRef({ startX: 0, startPos: 0, moved: false });

  useEffect(() => {
    (supabase.rpc as any)("get_top_stores_showcase").then(({ data }: any) => {
      setStores(Array.isArray(data) ? (data as Store[]) : []);
    });
  }, []);

  useEffect(() => {
    if (!stores || stores.length < 3) return;
    const track = trackRef.current;
    const firstGroup = firstGroupRef.current;
    if (!track || !firstGroup) return;

    const SPEED = 0.6; // px/frame @60fps (~36px/s)
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const groupWidth = firstGroup.offsetWidth;
      if (groupWidth > 0) {
        const paused = draggingRef.current || now < pausedUntilRef.current;
        if (!paused) {
          posRef.current += SPEED * (dt / (1000 / 60));
        }
        if (posRef.current >= groupWidth) posRef.current -= groupWidth;
        if (posRef.current < 0) posRef.current += groupWidth;
        track.style.transform = `translate3d(${-posRef.current}px, 0, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stores]);

  const pauseFor = (ms: number) => {
    pausedUntilRef.current = performance.now() + ms;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    dragRef.current = { startX: e.clientX, startPos: posRef.current, moved: false };
    try {
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 4) dragRef.current.moved = true;
    posRef.current = dragRef.current.startPos - dx;
  };

  const endDrag = (e?: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (e) {
      try {
        (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
      } catch {}
    }
    pauseFor(1500);
  };

  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragRef.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current.moved = false;
    }
  };

  if (stores === null) return null;
  if (stores.length < 3) return <MarqueeSocialProof />;

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
        className="overflow-hidden cursor-grab active:cursor-grabbing select-none"
        style={{ touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={(e) => endDrag(e)}
        onMouseEnter={() => pauseFor(400)}
        onClickCapture={onClickCapture}
      >
        <div
          ref={trackRef}
          className="flex whitespace-nowrap w-max will-change-transform"
          style={{ transform: "translate3d(0,0,0)" }}
        >
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