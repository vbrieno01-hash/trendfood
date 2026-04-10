import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ExternalLink, Link2, Unlink, RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface IFoodTabProps {
  orgId: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Aguardando Configuração", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: <Clock className="w-3 h-3" /> },
  connected: { label: "Conectado", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  error: { label: "Erro na Conexão", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: <AlertCircle className="w-3 h-3" /> },
};

const IFoodTab = ({ orgId }: IFoodTabProps) => {
  const queryClient = useQueryClient();
  const [merchantId, setMerchantId] = useState("");

  const { data: credentials, isLoading } = useQuery({
    queryKey: ["ifood-credentials", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ifood_credentials")
        .select("*")
        .eq("organization_id", orgId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (mid: string) => {
      if (credentials) {
        const { error } = await supabase
          .from("ifood_credentials")
          .update({ merchant_id: mid })
          .eq("organization_id", orgId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ifood_credentials")
          .insert({ organization_id: orgId, merchant_id: mid, status: "pending" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ifood-credentials", orgId] });
      toast.success("Merchant ID salvo com sucesso!");
    },
    onError: () => toast.error("Erro ao salvar Merchant ID"),
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("ifood_credentials")
        .delete()
        .eq("organization_id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ifood-credentials", orgId] });
      setMerchantId("");
      toast.success("Integração iFood desconectada");
    },
    onError: () => toast.error("Erro ao desconectar"),
  });

  const statusInfo = STATUS_MAP[credentials?.status ?? "pending"] ?? STATUS_MAP.pending;

  if (isLoading) {
    return <div className="animate-pulse space-y-4"><div className="h-32 bg-muted rounded-lg" /><div className="h-48 bg-muted rounded-lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Integração iFood</h2>
        <p className="text-sm text-muted-foreground">Receba pedidos do iFood direto no seu dashboard e sincronize seu cardápio.</p>
      </div>

      {/* Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Status da Conexão</CardTitle>
            <Badge className={`${statusInfo.color} flex items-center gap-1`}>
              {statusInfo.icon}
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {credentials?.status === "connected" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Sua loja está conectada ao iFood com o Merchant ID: <strong>{credentials.merchant_id}</strong>
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["ifood-credentials", orgId] })}>
                  <RefreshCw className="w-4 h-4 mr-1" /> Atualizar Status
                </Button>
                <Button variant="destructive" size="sm" onClick={() => disconnectMutation.mutate()} disabled={disconnectMutation.isPending}>
                  <Unlink className="w-4 h-4 mr-1" /> Desconectar
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Configure seu Merchant ID abaixo para iniciar a integração com o iFood.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuração</CardTitle>
          <CardDescription>Informe o Merchant ID da sua loja no iFood para vincular os pedidos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="merchant-id">Merchant ID (iFood)</Label>
            <Input
              id="merchant-id"
              placeholder="Ex: abc123-def456-ghi789"
              value={merchantId || credentials?.merchant_id || ""}
              onChange={(e) => setMerchantId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Você encontra esse ID no painel do iFood ou com o suporte deles.
            </p>
          </div>
          <Button
            onClick={() => saveMutation.mutate(merchantId || credentials?.merchant_id || "")}
            disabled={saveMutation.isPending || !(merchantId || credentials?.merchant_id)}
          >
            <Link2 className="w-4 h-4 mr-1" />
            {credentials ? "Atualizar Merchant ID" : "Vincular Loja"}
          </Button>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como funciona?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="font-bold text-foreground">1.</span>
              <span>Crie uma conta no <a href="https://developer.ifood.com.br/" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">Portal de Desenvolvedores do iFood <ExternalLink className="w-3 h-3" /></a></span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-foreground">2.</span>
              <span>Solicite acesso à API como integrador e aguarde a aprovação do iFood</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-foreground">3.</span>
              <span>Informe o <strong>Merchant ID</strong> da sua loja acima</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-foreground">4.</span>
              <span>Pedidos do iFood aparecerão automaticamente na sua cozinha com badge "iFood"</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-foreground">5.</span>
              <span>Seu cardápio será sincronizado automaticamente com o iFood</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature preview */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <div className="text-4xl">🛵</div>
            <h3 className="font-semibold">Em breve: Sincronização Completa</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Estamos finalizando a integração com a API do iFood. Assim que suas credenciais forem aprovadas, 
              você poderá receber pedidos e sincronizar o cardápio automaticamente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IFoodTab;
