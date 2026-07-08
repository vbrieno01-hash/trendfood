import { useState, useEffect } from "react";
import { ArrowLeft, Store, UtensilsCrossed, History, Tag, BarChart2, Grid3X3, Package, Wallet, FileText, DollarSign, Bot, CheckCircle2, XCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
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
import StorePaymentsTab from "@/components/admin/StorePaymentsTab";
import AiBotAddonCard from "@/components/dashboard/AiBotAddonCard";
import { useOrgAddon } from "@/hooks/useOrgAddon";

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
        business_hours: fullOrg.business_hours as unknown as Organization["business_hours"],
        store_address: fullOrg.store_address,
        delivery_config: fullOrg.delivery_config as unknown as Organization["delivery_config"],
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
        pix_key: fullOrg.pix_key,
        theme_config: fullOrg.theme_config as Organization["theme_config"],
        paused_categories: fullOrg.paused_categories as Organization["paused_categories"],
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
    { key: "pagamentos", label: "Pagamentos", icon: <DollarSign className="w-3.5 h-3.5" /> },
    { key: "robo", label: "Robô WhatsApp", icon: <Bot className="w-3.5 h-3.5" /> },
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
            <ReportsTab orgId={org.id} orgName={org.name} />
          </TabsContent>

          <TabsContent value="pagamentos" className="mt-4">
            <StorePaymentsTab orgId={org.id} orgName={org.name} />
          </TabsContent>

          <TabsContent value="robo" className="mt-4">
            <RoboWhatsAppSubTab
              orgId={org.id}
              requiresAiBotAddon={!!(fullOrg as any)?.requires_ai_bot_addon}
              active={activeSubTab === "robo"}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function RoboWhatsAppSubTab({
  orgId,
  requiresAiBotAddon,
  active,
}: {
  orgId: string;
  requiresAiBotAddon: boolean;
  active: boolean;
}) {
  const queryClient = useQueryClient();
  const { data: addon, isLoading } = useOrgAddon(orgId, "ai_bot");

  const { data: lastPayment } = useQuery({
    queryKey: ["admin-org-addon-last-payment", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_subscription_payments")
        .select("payment_id, status, amount_cents, created_at, resolved_at, plan")
        .eq("organization_id", orgId)
        .eq("plan", "addon:ai_bot")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: active,
    staleTime: 30_000,
  });

  // Force fresh data whenever the admin opens this tab — avoids showing
  // stale "aguardando pagamento" when the addon row was created after the
  // first fetch.
  useEffect(() => {
    if (!active) return;
    queryClient.invalidateQueries({ queryKey: ["org-addon", orgId, "ai_bot"] });
    queryClient.invalidateQueries({ queryKey: ["admin-org-addon-last-payment", orgId] });
  }, [active, orgId, queryClient]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["org-addon", orgId, "ai_bot"] });
    queryClient.invalidateQueries({ queryKey: ["admin-org-addon-last-payment", orgId] });
  };

  const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
  const fmtDateTime = (d?: string | null) =>
    d ? new Date(d).toLocaleString("pt-BR") : "—";

  return (
    <div className="space-y-4">
      <AiBotAddonCard addon={addon} loading={isLoading} orgId={orgId} />

      <div className="dashboard-glass rounded-2xl p-4 border-2 border-border/60 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Diagnóstico do add-on (somente leitura)
          </h3>
          <Button size="sm" variant="ghost" onClick={handleRefresh} className="h-7 gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <DiagRow label="requires_ai_bot_addon" value={requiresAiBotAddon ? "true" : "false"} ok={requiresAiBotAddon} />
          <DiagRow label="Status" value={addon?.status ?? "—"} ok={addon?.status === "active"} />
          <DiagRow label="Próxima cobrança" value={fmtDate(addon?.current_period_end)} />
          <DiagRow label="Preço mensal" value={addon ? `R$ ${Number(addon.price_monthly).toFixed(2).replace(".", ",")}` : "—"} />
          <DiagRow label="Dia da cobrança" value={addon?.billing_day ? String(addon.billing_day) : "—"} />
          <DiagRow
            label="Cartão recorrente (preapproval)"
            value={addon?.mp_preapproval_id ? "configurado" : "não configurado"}
            ok={!!addon?.mp_preapproval_id}
          />
        </div>

        <div className="pt-3 border-t border-border/60">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Última cobrança conhecida</p>
          {lastPayment ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <DiagRow label="payment_id" value={lastPayment.payment_id ?? "—"} />
              <DiagRow label="status" value={lastPayment.status ?? "—"} ok={lastPayment.status === "approved"} />
              <DiagRow
                label="valor"
                value={
                  lastPayment.amount_cents != null
                    ? `R$ ${(Number(lastPayment.amount_cents) / 100).toFixed(2).replace(".", ",")}`
                    : "—"
                }
              />
              <DiagRow label="criada em" value={fmtDateTime(lastPayment.created_at)} />
              <DiagRow label="resolvida em" value={fmtDateTime(lastPayment.resolved_at)} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma cobrança registrada ainda.</p>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground pt-2 border-t border-border/60">
          Nenhuma ação de ativação manual disponível aqui. A ativação e a renovação do período são feitas
          exclusivamente pelo webhook do Mercado Pago quando o pagamento é aprovado.
        </p>
      </div>
    </div>
  );
}

function DiagRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-muted/40">
      <span className="text-muted-foreground font-mono">{label}</span>
      <span className="font-semibold text-foreground flex items-center gap-1">
        {ok === true && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
        {ok === false && <XCircle className="w-3 h-3 text-muted-foreground" />}
        {value}
      </span>
    </div>
  );
}
