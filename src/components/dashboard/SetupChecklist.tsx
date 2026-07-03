import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Check, ChevronRight, Sparkles } from "lucide-react";

interface ChecklistItem {
  key: string;
  label: string;
  description: string;
  done: boolean;
  tab: string;
}

interface Props {
  orgId: string;
  orgWhatsapp?: string | null;
  orgAddress?: string | null;
  orgLogoUrl?: string | null;
  orgBannerUrl?: string | null;
  orgPrintMode?: string | null;
  onNavigate: (tab: string) => void;
}

export default function SetupChecklist({ orgId, orgWhatsapp, orgAddress, orgLogoUrl, orgBannerUrl, orgPrintMode, onNavigate }: Props) {
  const [menuCount, setMenuCount] = useState<number | null>(null);
  const [tableCount, setTableCount] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const [menuRes, tableRes] = await Promise.all([
        supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("tables").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      ]);
      setMenuCount(menuRes.count ?? 0);
      setTableCount(tableRes.count ?? 0);
    };
    load();
  }, [orgId]);

  if (menuCount === null || tableCount === null) return null;

  const items: ChecklistItem[] = [
    {
      key: "menu",
      label: "Adicionar itens ao cardápio",
      description: "Crie pelo menos 1 item para seus clientes verem",
      done: menuCount > 0,
      tab: "menu",
    },
    {
      key: "tables",
      label: "Criar mesas ou QR Codes",
      description: "Configure mesas para pedidos presenciais",
      done: tableCount > 0,
      tab: "tables",
    },
    {
      key: "whatsapp",
      label: "Configurar WhatsApp",
      description: "Receba notificações de pedidos pelo WhatsApp",
      done: !!orgWhatsapp,
      tab: "profile",
    },
    {
      key: "logo",
      label: "Adicionar logo da loja",
      description: "Sua marca aparece para os clientes",
      done: !!orgLogoUrl,
      tab: "profile",
    },
    {
      key: "banner",
      label: "Adicionar banner de capa",
      description: "Banner grande no topo da vitrine, dá um ar profissional",
      done: !!orgBannerUrl,
      tab: "profile",
    },
    {
      key: "address",
      label: "Definir endereço da loja",
      description: "Necessário para delivery e cálculo de frete",
      done: !!orgAddress,
      tab: "profile",
    },
    {
      key: "printer",
      label: "Configurar impressora",
      description: "Escolha o modo de impressão e teste",
      done: !!orgPrintMode && orgPrintMode !== "browser",
      tab: "printer",
    },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const progress = Math.round((doneCount / items.length) * 100);

  // If 100% done, don't show checklist
  if (progress === 100) return null;

  return (
    <div className="dashboard-glass rounded-2xl overflow-hidden animate-dashboard-fade-in">
      <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-glow">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground tracking-tight">Falta pouco! Configure sua loja 🚀</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="font-medium text-foreground tabular-nums">{doneCount}</span> de <span className="tabular-nums">{items.length}</span> concluídos — complete para começar a vender
          </p>
        </div>
        <span className="text-2xl font-bold text-primary tabular-nums tracking-tight">{progress}%</span>
      </div>
      <div className="px-2 py-2">
        <Progress value={progress} className="h-1.5 mx-3 mb-2 [&>div]:bg-primary [&>div]:transition-all [&>div]:duration-500" />
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => !item.done && onNavigate(item.tab)}
            disabled={item.done}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-premium group ${
              item.done
                ? "opacity-60 cursor-default"
                : "hover:bg-accent/60 cursor-pointer"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-premium ${
                item.done
                  ? "bg-emerald-500 text-white shadow-elev-sm"
                  : "border-2 border-muted-foreground/30 group-hover:border-primary/50"
              }`}
            >
              {item.done && <Check className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {item.label}
              </p>
              <p className="text-xs text-muted-foreground truncate">{item.description}</p>
            </div>
            {!item.done && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 group-hover:translate-x-0.5 group-hover:text-primary transition-premium" />}
          </button>
        ))}
      </div>
    </div>
  );
}
