import { useState } from "react";
import { ArrowLeft, Store, UtensilsCrossed, History, Tag, BarChart2, Grid3X3, Package, Wallet, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Organization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import MenuTab from "@/components/dashboard/MenuTab";
import HistoryTab from "@/components/dashboard/HistoryTab";
import CouponsTab from "@/components/dashboard/CouponsTab";
import BestSellersTab from "@/components/dashboard/BestSellersTab";
import TablesTab from "@/components/dashboard/TablesTab";
import StockTab from "@/components/dashboard/StockTab";
import CaixaTab from "@/components/dashboard/CaixaTab";
import ReportsTab from "@/components/dashboard/ReportsTab";
import StoreProfileTab from "@/components/dashboard/StoreProfileTab";

interface AdminStoreManagerProps {
  org: {
    id: string;
    name: string;
    slug: string;
    emoji: string;
    subscription_plan: string;
    subscription_status: string;
  };
  onBack: () => void;
}

export default function AdminStoreManager({ org, onBack }: AdminStoreManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState("cardapio");

  const { data: fullOrg, isLoading } = useQuery({
    queryKey: ["admin-org-full", org.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", org.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const orgForComponents: Organization = fullOrg
    ? {
        id: fullOrg.id,
        name: fullOrg.name,
        slug: fullOrg.slug,
        emoji: fullOrg.emoji,
        primary_color: fullOrg.primary_color,
        description: fullOrg.description,
        logo_url: fullOrg.logo_url,
        user_id: fullOrg.user_id,
        created_at: fullOrg.created_at,
        whatsapp: fullOrg.whatsapp,
        business_hours: fullOrg.business_hours as Organization["business_hours"],
        store_address: fullOrg.store_address,
        delivery_config: fullOrg.delivery_config as Organization["delivery_config"],
        pix_confirmation_mode: fullOrg.pix_confirmation_mode as Organization["pix_confirmation_mode"],
        subscription_status: fullOrg.subscription_status,
        subscription_plan: fullOrg.subscription_plan,
        trial_ends_at: fullOrg.trial_ends_at,
        paused: fullOrg.paused,
        printer_width: fullOrg.printer_width as Organization["printer_width"],
        banner_url: fullOrg.banner_url,
        courier_config: fullOrg.courier_config as Organization["courier_config"],
        print_mode: fullOrg.print_mode as Organization["print_mode"],
        cnpj: fullOrg.cnpj,
        force_open: fullOrg.force_open,
        tax_regime: fullOrg.tax_regime,
        category_order: fullOrg.category_order as Organization["category_order"],
      }
    : {
        id: org.id,
        name: org.name,
        slug: org.slug,
        emoji: org.emoji,
        primary_color: "#f97316",
        description: null,
        logo_url: null,
        user_id: "",
        created_at: "",
      };

  const tabs = [
    { key: "cardapio", label: "Cardápio", icon: <UtensilsCrossed className="w-3.5 h-3.5" /> },
    { key: "perfil", label: "Dados da Loja", icon: <Store className="w-3.5 h-3.5" /> },
    { key: "pedidos", label: "Histórico", icon: <History className="w-3.5 h-3.5" /> },
    { key: "cupons", label: "Cupons", icon: <Tag className="w-3.5 h-3.5" /> },
    { key: "vendidos", label: "Mais Vendidos", icon: <BarChart2 className="w-3.5 h-3.5" /> },
    { key: "mesas", label: "Mesas", icon: <Grid3X3 className="w-3.5 h-3.5" /> },
    { key: "estoque", label: "Estoque", icon: <Package className="w-3.5 h-3.5" /> },
    { key: "caixa", label: "Caixa", icon: <Wallet className="w-3.5 h-3.5" /> },
    { key: "relatorios", label: "Relatórios", icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-4 animate-admin-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xl">{org.emoji !== "🍽️" ? org.emoji : "🏪"}</span>
          <div>
            <h2 className="text-lg font-bold text-foreground">{org.name}</h2>
            <p className="text-xs text-muted-foreground font-mono">/unidade/{org.slug}</p>
          </div>
          <Badge className="text-[10px] px-2 py-0.5 rounded-full border-0 font-bold uppercase ml-2">
            {org.subscription_plan}
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1.5 rounded-xl">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="cardapio" className="mt-4">
            <MenuTab organization={orgForComponents} />
          </TabsContent>

          <TabsContent value="perfil" className="mt-4">
            <StoreProfileTab organization={orgForComponents} effectivePlan={org.subscription_plan} />
          </TabsContent>

          <TabsContent value="pedidos" className="mt-4">
            <HistoryTab orgId={org.id} />
          </TabsContent>

          <TabsContent value="cupons" className="mt-4">
            <CouponsTab orgId={org.id} />
          </TabsContent>

          <TabsContent value="vendidos" className="mt-4">
            <BestSellersTab orgId={org.id} />
          </TabsContent>

          <TabsContent value="mesas" className="mt-4">
            <TablesTab organization={orgForComponents} />
          </TabsContent>

          <TabsContent value="estoque" className="mt-4">
            <StockTab orgId={org.id} />
          </TabsContent>

          <TabsContent value="caixa" className="mt-4">
            <CaixaTab orgId={org.id} />
          </TabsContent>

          <TabsContent value="relatorios" className="mt-4">
            <ReportsTab orgId={org.id} orgName={org.name} orgEmoji={org.emoji} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
