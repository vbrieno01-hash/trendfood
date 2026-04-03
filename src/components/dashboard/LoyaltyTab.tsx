import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Gift, Users, History, Info } from "lucide-react";
import { toast } from "sonner";
import {
  useLoyaltyConfig,
  useUpsertLoyaltyConfig,
  useLoyaltyPointsList,
  useLoyaltyRedemptions,
} from "@/hooks/useLoyalty";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const maskPhone = (phone: string) => {
  if (phone.length <= 4) return phone;
  return phone.slice(0, 2) + "•".repeat(phone.length - 4) + phone.slice(-4);
};

interface Props {
  orgId: string;
}

export default function LoyaltyTab({ orgId }: Props) {
  const { data: config, isLoading } = useLoyaltyConfig(orgId);
  const upsert = useUpsertLoyaltyConfig();
  const { data: customers = [] } = useLoyaltyPointsList(orgId);
  const { data: redemptions = [] } = useLoyaltyRedemptions(orgId);

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [spendPerPoint, setSpendPerPoint] = useState("");
  const [pointsToRedeem, setPointsToRedeem] = useState("");
  const [rewardType, setRewardType] = useState<"fixed" | "percent">("fixed");
  const [rewardValue, setRewardValue] = useState("");
  const [dirty, setDirty] = useState(false);
  const [synced, setSynced] = useState(false);

  // Sync from server once on load
  useEffect(() => {
    if (config && !synced) {
      setEnabled(config.enabled);
      setSpendPerPoint(String(config.spend_per_point));
      setPointsToRedeem(String(config.points_to_redeem));
      setRewardType((config.reward_type as "fixed" | "percent") ?? "fixed");
      setRewardValue(String(config.reward_value));
      setSynced(true);
    }
  }, [config, synced]);

  const effectiveEnabled = enabled ?? config?.enabled ?? false;

  const handleSave = async () => {
    const payload = {
      organization_id: orgId,
      enabled: effectiveEnabled,
      spend_per_point: Number(spendPerPoint) || 50,
      points_to_redeem: Number(pointsToRedeem) || 10,
      reward_type: rewardType,
      reward_value: Number(rewardValue) || 20,
    };
    try {
      await upsert.mutateAsync(payload);
      toast.success("Configuração de fidelidade salva!");
      setDirty(false);
    } catch (err) {
      toast.error("Erro ao salvar configuração");
    }
  };

  const [tab, setTab] = useState<"config" | "customers" | "history">("config");

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        {[
          { key: "config" as const, icon: Gift, label: "Configuração" },
          { key: "customers" as const, icon: Users, label: "Clientes" },
          { key: "history" as const, icon: History, label: "Resgates" },
        ].map(({ key, icon: Icon, label }) => (
          <Button
            key={key}
            variant={tab === key ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setTab(key)}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Button>
        ))}
      </div>

      {tab === "config" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" />
              Programa de Fidelidade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <Label>Ativar programa</Label>
              <Switch
                checked={effectiveEnabled}
                onCheckedChange={(v) => { setEnabled(v); setDirty(true); }}
              />
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Valor gasto por ponto (R$)</Label>
                <Input
                  type="number"
                  min={1}
                  value={spendPerPoint}
                  onChange={(e) => { setSpendPerPoint(e.target.value); setDirty(true); }}
                />
                <p className="text-xs text-muted-foreground">Ex: a cada R${spendPerPoint || "?"}, ganha 1 ponto</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Pontos para resgate</Label>
                <Input
                  type="number"
                  min={1}
                  value={pointsToRedeem}
                  onChange={(e) => { setPointsToRedeem(e.target.value); setDirty(true); }}
                />
                <p className="text-xs text-muted-foreground">Quantidade de pontos para usar o desconto</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de desconto</Label>
                <Select
                  value={rewardType}
                  onValueChange={(v: "fixed" | "percent") => { setRewardType(v); setDirty(true); }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                    <SelectItem value="percent">Porcentagem (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  Valor do desconto {rewardType === "percent" ? "(%)" : "(R$)"}
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={rewardValue}
                  onChange={(e) => { setRewardValue(e.target.value); setDirty(true); }}
                />
              </div>
            </div>

            {dirty && (
              <Button onClick={handleSave} disabled={upsert.isPending} className="w-full sm:w-auto">
                {upsert.isPending ? "Salvando..." : "Salvar configuração"}
              </Button>
            )}

            <div className="bg-muted/50 border border-border rounded-lg p-4 mt-2 space-y-3 text-sm">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                Como funciona para seus clientes
              </h4>
              <ul className="space-y-2 text-muted-foreground list-none">
                <li>1️⃣ O cliente faz um pedido e informa o <strong className="text-foreground">telefone</strong>.</li>
                <li>2️⃣ A cada <strong className="text-foreground">R${spendPerPoint || "?"}</strong> gastos, ele ganha <strong className="text-foreground">1 ponto</strong> automaticamente.</li>
                <li>3️⃣ Quando acumular <strong className="text-foreground">{pointsToRedeem || "?"} pontos</strong>, pode trocar por um desconto de <strong className="text-foreground">{rewardType === "percent" ? `${rewardValue || "?"}%` : `R$${rewardValue || "?"}`}</strong>.</li>
                <li>4️⃣ O desconto é aplicado no <strong className="text-foreground">próximo pedido</strong>.</li>
                <li>5️⃣ Os pontos são identificados pelo telefone — <strong className="text-foreground">sem cadastro extra</strong>.</li>
              </ul>

              {Number(spendPerPoint) > 0 && Number(pointsToRedeem) > 0 && Number(rewardValue) > 0 && (
                <>
                  <Separator />
                  <div className="text-muted-foreground">
                    <p className="font-medium text-foreground text-xs mb-1">📌 Exemplo prático:</p>
                    <p>
                      Se um cliente gastar{" "}
                      <strong className="text-foreground">
                        {fmt(Number(spendPerPoint) * Number(pointsToRedeem))}
                      </strong>{" "}
                      no total, ele acumula{" "}
                      <strong className="text-foreground">{pointsToRedeem} pontos</strong> e pode resgatar um desconto de{" "}
                      <strong className="text-foreground">
                        {rewardType === "percent" ? `${rewardValue}%` : fmt(Number(rewardValue))}
                      </strong>{" "}
                      no próximo pedido.
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "customers" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Clientes fidelizados ({customers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum cliente acumulou pontos ainda.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {customers.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <span className="text-sm font-mono">{maskPhone(c.phone)}</span>
                      <p className="text-xs text-muted-foreground">Total gasto: {fmt(c.total_spent)}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {c.points} pts
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "history" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Histórico de Resgates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {redemptions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum resgate realizado.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {redemptions.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <span className="text-sm font-mono">{maskPhone(r.phone)}</span>
                      <p className="text-xs text-muted-foreground">
                        -{r.points_used} pts → {fmt(r.discount_value)} desconto
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
