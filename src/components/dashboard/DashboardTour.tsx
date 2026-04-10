import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

interface TourStep {
  targetSelector: string;
  title: string;
  description: string;
}

const STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="home"]',
    title: "🏠 Página Inicial",
    description: "Aqui você vê o resumo do dia: pedidos recentes, faturamento e atalhos rápidos para as principais funções.",
  },
  {
    targetSelector: '[data-tour="menu"]',
    title: "🍽️ Cardápio",
    description: "Monte seu cardápio com categorias, fotos, preços e adicionais. Os clientes verão tudo na página da sua loja.",
  },
  {
    targetSelector: '[data-tour="operations"]',
    title: "🔥 Cozinha & Pedidos",
    description: "Gerencie pedidos em tempo real. Aceite, prepare e finalize pedidos direto do painel — com impressão automática.",
  },
  {
    targetSelector: '[data-tour="tables"]',
    title: "🪑 Mesas & QR Code",
    description: "Crie mesas e gere QR Codes para pedidos presenciais. Seus clientes escaneiam e pedem pelo celular!",
  },
  {
    targetSelector: '[data-tour="reports"]',
    title: "📊 Relatórios",
    description: "Acompanhe vendas, produtos mais vendidos, ticket médio e faturamento. Dados que ajudam você a crescer.",
  },
  {
    targetSelector: '[data-tour="profile"]',
    title: "🏪 Dados da Loja",
    description: "Configure WhatsApp, endereço, logo, banner e horário de funcionamento. Tudo que seus clientes precisam saber.",
  },
];

interface DashboardTourProps {
  orgId: string;
  onComplete: () => void;
}

const DashboardTour = ({ orgId, onComplete }: DashboardTourProps) => {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const current = STEPS[step];

  const measureTarget = useCallback(() => {
    if (!current) return;
    const el = document.querySelector(current.targetSelector);
    if (el) {
      // Ensure the element's parent group is expanded for sidebar items
      const collapsible = el.closest("[data-state]");
      if (collapsible && collapsible.getAttribute("data-state") === "closed") {
        const trigger = collapsible.querySelector("button");
        trigger?.click();
        // Re-measure after a tick
        requestAnimationFrame(() => {
          const r = el.getBoundingClientRect();
          setRect(r);
          el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
        return;
      }
      const r = el.getBoundingClientRect();
      setRect(r);
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else {
      setRect(null);
    }
  }, [current]);

  useEffect(() => {
    measureTarget();
    window.addEventListener("resize", measureTarget);
    return () => window.removeEventListener("resize", measureTarget);
  }, [measureTarget]);

  const finish = async () => {
    await supabase
      .from("organizations")
      .update({ dashboard_tour_done: true } as any)
      .eq("id", orgId);
    onComplete();
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      finish();
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSkip = () => {
    finish();
  };

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!rect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

    const padding = 12;
    const tooltipWidth = 320;
    const tooltipHeight = 200;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Try right of target
    if (rect.right + padding + tooltipWidth < vw) {
      return {
        top: Math.max(16, Math.min(rect.top, vh - tooltipHeight - 16)),
        left: rect.right + padding,
      };
    }
    // Try left
    if (rect.left - padding - tooltipWidth > 0) {
      return {
        top: Math.max(16, Math.min(rect.top, vh - tooltipHeight - 16)),
        left: rect.left - padding - tooltipWidth,
      };
    }
    // Below
    return {
      top: rect.bottom + padding,
      left: Math.max(16, Math.min(rect.left, vw - tooltipWidth - 16)),
    };
  };

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Dark overlay with cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left - 6}
                y={rect.top - 4}
                width={rect.width + 12}
                height={rect.height + 8}
                rx="10"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(0,0,0,0.7)"
          mask="url(#tour-mask)"
          style={{ pointerEvents: "all" }}
          onClick={(e) => e.stopPropagation()}
        />
      </svg>

      {/* Highlight ring */}
      {rect && (
        <div
          className="absolute rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-transparent pointer-events-none animate-pulse"
          style={{
            top: rect.top - 4,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 8,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute bg-card border border-border rounded-2xl shadow-2xl p-5 w-80 z-[10000] animate-in fade-in-0 slide-in-from-bottom-3 duration-300"
        style={getTooltipStyle()}
      >
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-base text-foreground">{current.title}</h3>
          <button onClick={handleSkip} className="text-muted-foreground hover:text-foreground p-1 -mt-1 -mr-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {current.description}
        </p>

        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full flex-1 transition-colors ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Pular tour
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button size="sm" variant="outline" onClick={handlePrev} className="gap-1">
                <ChevronLeft className="w-3.5 h-3.5" />
                Anterior
              </Button>
            )}
            <Button size="sm" onClick={handleNext} className="gap-1">
              {step < STEPS.length - 1 ? (
                <>
                  Próximo
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              ) : (
                "Concluir ✨"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardTour;
