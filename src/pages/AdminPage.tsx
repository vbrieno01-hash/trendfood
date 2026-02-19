import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Package, Store, CheckCircle2, XCircle, ShieldAlert } from "lucide-react";
import { usePlatformDeliveryConfig, useUpdatePlatformDeliveryConfig } from "@/hooks/usePlatformDeliveryConfig";
import { DeliveryConfig } from "@/hooks/useDeliveryFee";
import { toast } from "sonner";

const ADMIN_EMAILS = ["brenojackson30@gmail.com"];

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  store_address: string | null;
  created_at: string;
  subscription_status: string;
}

export default function AdminPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth?redirect=/admin" replace />;
  }

  if (!ADMIN_EMAILS.includes(user.email ?? "")) {
    return <Navigate to="/" replace />;
  }

  return <AdminContent />;
}

function AdminContent() {
  const { data: globalConfig, isLoading: configLoading } = usePlatformDeliveryConfig();
  const updateConfig = useUpdatePlatformDeliveryConfig();

  const [localConfig, setLocalConfig] = useState<DeliveryConfig | null>(null);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);

  // Sync local state when global config loads
  useEffect(() => {
    if (globalConfig && !localConfig) {
      setLocalConfig(globalConfig);
    }
  }, [globalConfig, localConfig]);

  // Load all organizations
  useEffect(() => {
    supabase
      .from("organizations")
      .select("id, name, slug, store_address, created_at, subscription_status")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrgs((data as OrgRow[]) ?? []);
        setOrgsLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!localConfig) return;
    try {
      await updateConfig.mutateAsync(localConfig);
      toast.success("Configuração de frete salva! Todas as lojas foram atualizadas.");
    } catch {
      toast.error("Erro ao salvar configuração.");
    }
  };

  const cfg = localConfig ?? globalConfig;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Painel Admin</h1>
            <p className="text-xs text-muted-foreground">TrendFood — Configurações da plataforma</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* ── Configuração Global de Frete ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="w-5 h-5 text-primary" />
              Tabela Global de Frete
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Estas configurações se aplicam a <strong>todas as lojas</strong> da plataforma.
              Qualquer alteração é refletida imediatamente para todos os clientes.
            </p>
          </CardHeader>
          <CardContent>
            {configLoading || !cfg ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-medium mb-1 block">
                      Frete faixa 1 (R$) <span className="text-muted-foreground font-normal">até {cfg.tier1_km} km</span>
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={cfg.fee_tier1}
                      onChange={(e) => setLocalConfig((p) => p ? { ...p, fee_tier1: parseFloat(e.target.value) || 0 } : p)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1 block">Limite faixa 1 (km)</Label>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={cfg.tier1_km}
                      onChange={(e) => setLocalConfig((p) => p ? { ...p, tier1_km: parseFloat(e.target.value) || 2 } : p)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1 block">
                      Frete faixa 2 (R$) <span className="text-muted-foreground font-normal">{cfg.tier1_km}–{cfg.tier2_km} km</span>
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={cfg.fee_tier2}
                      onChange={(e) => setLocalConfig((p) => p ? { ...p, fee_tier2: parseFloat(e.target.value) || 0 } : p)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1 block">Limite faixa 2 (km)</Label>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={cfg.tier2_km}
                      onChange={(e) => setLocalConfig((p) => p ? { ...p, tier2_km: parseFloat(e.target.value) || 5 } : p)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1 block">
                      Frete faixa 3 (R$) <span className="text-muted-foreground font-normal">acima de {cfg.tier2_km} km</span>
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={cfg.fee_tier3}
                      onChange={(e) => setLocalConfig((p) => p ? { ...p, fee_tier3: parseFloat(e.target.value) || 0 } : p)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1 block">Frete grátis acima de (R$)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={5}
                      value={cfg.free_above}
                      onChange={(e) => setLocalConfig((p) => p ? { ...p, free_above: parseFloat(e.target.value) || 0 } : p)}
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-secondary/60 rounded-xl p-4 text-sm space-y-1.5">
                  <p className="font-semibold text-foreground text-xs mb-2">Preview da tabela atual:</p>
                  <p className="text-muted-foreground">📍 Até <strong>{cfg.tier1_km} km</strong> → <strong className="text-foreground">{fmt(cfg.fee_tier1)}</strong></p>
                  <p className="text-muted-foreground">📍 <strong>{cfg.tier1_km}–{cfg.tier2_km} km</strong> → <strong className="text-foreground">{fmt(cfg.fee_tier2)}</strong></p>
                  <p className="text-muted-foreground">📍 Acima de <strong>{cfg.tier2_km} km</strong> → <strong className="text-foreground">{fmt(cfg.fee_tier3)}</strong></p>
                  <p className="text-muted-foreground">🎁 Pedidos acima de <strong>{fmt(cfg.free_above)}</strong> → <strong className="text-foreground">Frete grátis</strong></p>
                </div>

                <Button onClick={handleSave} disabled={updateConfig.isPending} className="w-full sm:w-auto">
                  {updateConfig.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando...</>
                  ) : (
                    "Salvar para todas as lojas"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Lista de Lojas ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="w-5 h-5 text-primary" />
              Lojas Cadastradas
              {!orgsLoading && (
                <span className="ml-auto text-sm font-normal text-muted-foreground">{orgs.length} lojas</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orgsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
              </div>
            ) : (
              <div className="space-y-2">
                {orgs.map((org) => (
                  <div
                    key={org.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-foreground truncate">{org.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          org.subscription_status === "active"
                            ? "bg-green-500/15 text-green-700 dark:text-green-400"
                            : "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
                        }`}>
                          {org.subscription_status === "active" ? "Ativo" : "Trial"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">/unidade/{org.slug}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs shrink-0">
                      {org.store_address ? (
                        <span className="flex items-center gap-1 text-green-700 dark:text-green-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Endereço OK
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-yellow-700 dark:text-yellow-400">
                          <XCircle className="w-3.5 h-3.5" />
                          Sem endereço
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                      {new Date(org.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                ))}
                {orgs.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-4">Nenhuma loja cadastrada ainda.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
