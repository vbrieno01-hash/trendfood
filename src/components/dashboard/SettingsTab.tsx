import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, ShieldAlert, Mail, KeyRound, Store, Clock, Wallet, Scale, Truck } from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import VersionCheckCard from "@/components/dashboard/VersionCheckCard";

export default function SettingsTab() {
  const { user, signOut, organization: currentOrg, refreshOrganization } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);
  const [forceOpenLoading, setForceOpenLoading] = useState(false);
  const [schedulingEnabled, setSchedulingEnabled] = useState(false);
  const [minAdvance, setMinAdvance] = useState("30");
  const [schedulingLoading, setSchedulingLoading] = useState(false);
  const [billingLimit, setBillingLimit] = useState(0);
  const [billingLoading, setBillingLoading] = useState(false);
  const [taxRegime, setTaxRegime] = useState<string>("");
  const [taxRegimeLoading, setTaxRegimeLoading] = useState(false);
  const [acceptsDelivery, setAcceptsDelivery] = useState(true);
  const [acceptsPickup, setAcceptsPickup] = useState(true);
  const [serviceModesLoading, setServiceModesLoading] = useState(false);
  const [singleChoiceAddons, setSingleChoiceAddons] = useState(false);
  const [singleChoiceLoading, setSingleChoiceLoading] = useState(false);

  // Load current force_open state
  useEffect(() => {
    if (currentOrg?.id) {
      supabase
        .from("organizations")
        .select("force_open, scheduling_config, tax_regime, service_modes, single_choice_addons")
        .eq("id", currentOrg.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setForceOpen(!!(data as any).force_open);
            const sc = (data as any).scheduling_config as { enabled?: boolean; min_advance_minutes?: number } | null;
            if (sc) {
              setSchedulingEnabled(!!sc.enabled);
              setMinAdvance(String(sc.min_advance_minutes ?? 30));
            }
            setBillingLimit((data as any).billing_alert_limit ?? 0);
            setTaxRegime((data as any).tax_regime ?? "");
            const sm = (data as any).service_modes as { delivery?: boolean; pickup?: boolean } | null;
            setAcceptsDelivery(sm?.delivery !== false);
            setAcceptsPickup(sm?.pickup !== false);
            setSingleChoiceAddons(!!(data as any).single_choice_addons);
          }
        });
    }
  }, [currentOrg?.id]);

  const handleToggleForceOpen = async (checked: boolean) => {
    if (!currentOrg?.id) return;
    setForceOpenLoading(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ force_open: checked } as any)
        .eq("id", currentOrg.id);
      if (error) throw error;
      setForceOpen(checked);
      await refreshOrganization();
      toast.success(checked ? "Loja forçada como ABERTA 24h." : "Horário de funcionamento normal restaurado.");
    } catch {
      toast.error("Erro ao alterar configuração.");
    } finally {
      setForceOpenLoading(false);
    }
  };

  const handleSaveScheduling = async () => {
    if (!currentOrg?.id) return;
    setSchedulingLoading(true);
    try {
      const config = { enabled: schedulingEnabled, min_advance_minutes: Math.max(15, parseInt(minAdvance) || 30) };
      const { error } = await supabase
        .from("organizations")
        .update({ scheduling_config: config } as any)
        .eq("id", currentOrg.id);
      if (error) throw error;
      await refreshOrganization();
      toast.success("Configuração de agendamento salva!");
    } catch {
      toast.error("Erro ao salvar configuração de agendamento.");
    } finally {
      setSchedulingLoading(false);
    }
  };

  const handleSaveServiceModes = async (delivery: boolean, pickup: boolean) => {
    if (!currentOrg?.id) return;
    if (!delivery && !pickup) {
      toast.error("Pelo menos um modo de atendimento precisa estar ativo.");
      return;
    }
    setServiceModesLoading(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ service_modes: { delivery, pickup } } as any)
        .eq("id", currentOrg.id);
      if (error) throw error;
      setAcceptsDelivery(delivery);
      setAcceptsPickup(pickup);
      await refreshOrganization();
      toast.success("Modos de atendimento atualizados!");
    } catch {
      toast.error("Erro ao salvar modos de atendimento.");
    } finally {
      setServiceModesLoading(false);
    }
  };

  const handleToggleSingleChoiceAddons = async (checked: boolean) => {
    if (!currentOrg?.id) return;
    setSingleChoiceLoading(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ single_choice_addons: checked } as any)
        .eq("id", currentOrg.id);
      if (error) throw error;
      setSingleChoiceAddons(checked);
      toast.success(
        checked
          ? "Adicionais agora s\u00e3o de escolha \u00fanica por padr\u00e3o."
          : "Adicionais voltaram ao modo m\u00faltiplo por padr\u00e3o.",
      );
    } catch {
      toast.error("Erro ao alterar configura\u00e7\u00e3o.");
    } finally {
      setSingleChoiceLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setPwdLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message ?? "Erro ao alterar senha.");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await signOut();
      toast.info("Conta desativada. Entre em contato para exclusão completa dos dados.");
      navigate("/auth", { replace: true });
    } catch {
      toast.error("Erro ao excluir conta.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div className="animate-dashboard-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Gerencie sua conta e segurança</p>
      </div>

      {/* Account info */}
      <div className="dashboard-glass rounded-2xl overflow-hidden animate-dashboard-fade-in dash-delay-1">
        <div className="px-4 py-3 border-b border-border bg-secondary/30">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informações da conta</p>
        </div>
        <div className="px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">E-mail</p>
            <p className="text-sm font-medium text-foreground">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Force Open Toggle */}
      <div className="dashboard-glass rounded-2xl overflow-hidden animate-dashboard-fade-in dash-delay-2">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <Store className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Controle manual</p>
        </div>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Forçar Loja Aberta</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-[260px]">
                {forceOpen
                  ? "A loja está aberta fora do horário programado. Pausas configuradas continuam funcionando."
                  : "Ative para manter a loja aberta fora do horário, mas pausas continuam valendo."}
              </p>
            </div>
            <Switch
              checked={forceOpen}
              onCheckedChange={handleToggleForceOpen}
              disabled={forceOpenLoading}
            />
          </div>
        </div>
      </div>

      {/* Versão do sistema + verificação manual */}
      <VersionCheckCard />

      {/* Service modes (Delivery / Pickup) */}
      <div className="dashboard-glass rounded-2xl overflow-hidden animate-dashboard-fade-in dash-delay-2">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <Truck className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modos de atendimento</p>
        </div>
        <div className="px-4 py-4 space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Escolha como sua loja atende os clientes no cardápio online. Pelo menos um modo precisa estar ativo.
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <span>🛵</span> Aceita Entrega
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-[260px]">
                Clientes podem pedir delivery com endereço.
              </p>
            </div>
            <Switch
              checked={acceptsDelivery}
              disabled={serviceModesLoading}
              onCheckedChange={(v) => handleSaveServiceModes(v, acceptsPickup)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <span>🏃</span> Aceita Retirada no local
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-[260px]">
                Clientes podem retirar o pedido diretamente na loja.
              </p>
            </div>
            <Switch
              checked={acceptsPickup}
              disabled={serviceModesLoading}
              onCheckedChange={(v) => handleSaveServiceModes(acceptsDelivery, v)}
            />
          </div>
        </div>
      </div>

      {/* Adicionais: escolha \u00fanica padr\u00e3o */}
      <div className="dashboard-glass rounded-2xl overflow-hidden animate-dashboard-fade-in dash-delay-2">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <Scale className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Adicionais</p>
        </div>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Escolha \u00fanica em todos os adicionais</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-[280px]">
                {singleChoiceAddons
                  ? "Cliente s\u00f3 pode escolher 1 adicional por produto (sem quantidade). Voc\u00ea pode liberar exce\u00e7\u00f5es marcando adicionais como 'm\u00faltiplo' no card\u00e1pio."
                  : "Ideal para pizzarias: evita que o cliente marque v\u00e1rias bordas/sabores. Ligue e sobrescreva por adicional quando precisar liberar m\u00faltiplas escolhas."}
              </p>
            </div>
            <Switch
              checked={singleChoiceAddons}
              onCheckedChange={handleToggleSingleChoiceAddons}
              disabled={singleChoiceLoading}
            />
          </div>
        </div>
      </div>

      {/* Scheduling config */}
      <div className="dashboard-glass rounded-2xl overflow-hidden animate-dashboard-fade-in dash-delay-2">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agendamento de pedidos</p>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Permitir agendamento</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-[260px]">
                {schedulingEnabled
                  ? "Clientes podem escolher um horário futuro para o pedido."
                  : "Ative para permitir que clientes agendem horários de entrega/retirada."}
              </p>
            </div>
            <Switch
              checked={schedulingEnabled}
              onCheckedChange={setSchedulingEnabled}
            />
          </div>
          {schedulingEnabled && (
            <div>
              <Label htmlFor="min-advance" className="text-xs font-medium">Antecedência mínima (minutos)</Label>
              <Input
                id="min-advance"
                type="number"
                min={15}
                max={180}
                value={minAdvance}
                onChange={(e) => setMinAdvance(e.target.value)}
                className="mt-1 w-32"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ex: 30 = o primeiro horário disponível será daqui a 30 min
              </p>
            </div>
          )}
          <Button onClick={handleSaveScheduling} disabled={schedulingLoading} size="sm" className="h-9">
            {schedulingLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando...</> : "Salvar agendamento"}
          </Button>
        </div>
      </div>

      {/* Billing alert */}
      <div className="dashboard-glass rounded-2xl overflow-hidden animate-dashboard-fade-in dash-delay-2">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gestão Fiscal</p>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground">Aviso de Limite de Faturamento</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed max-w-sm">
              Defina o limite mensal de faturamento do seu negócio (ex: R$ 6.750 para MEI, R$ 2.259 para CPF, R$ 30.000 para ME). Você receberá um alerta no painel quando atingir 80% deste valor. Deixe R$ 0,00 para desativar.
            </p>
          </div>
          <CurrencyInput
            value={billingLimit}
            onChange={(v) => setBillingLimit(v ?? 0)}
            className="w-48"
          />
          <Button
            size="sm"
            className="h-9"
            disabled={billingLoading}
            onClick={async () => {
              if (!currentOrg?.id) return;
              setBillingLoading(true);
              try {
                const { error } = await supabase
                  .from("organizations")
                  .update({ billing_alert_limit: billingLimit || null } as any)
                  .eq("id", currentOrg.id);
                if (error) throw error;
                await refreshOrganization();
                toast.success("Limite de faturamento salvo!");
              } catch {
                toast.error("Erro ao salvar limite.");
              } finally {
                setBillingLoading(false);
              }
            }}
          >
            {billingLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando...</> : "Salvar limite"}
          </Button>
        </div>
      </div>

      {/* Tax regime config */}
      <div className="dashboard-glass rounded-2xl overflow-hidden animate-dashboard-fade-in dash-delay-2">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <Scale className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Configurações Fiscais</p>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground">Regime Tributário</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed max-w-sm">
              Informe seu regime tributário para receber alertas personalizados de faturamento anual. Isso não altera nenhum cálculo.
            </p>
          </div>
          <RadioGroup value={taxRegime} onValueChange={setTaxRegime} className="space-y-2">
            {[
              { value: "cpf", label: "CPF — Pessoa Física", desc: "Limite anual: R$ 27.110,40" },
              { value: "mei", label: "MEI — Microempreendedor Individual", desc: "Limite anual: R$ 81.000,00" },
              { value: "me", label: "ME — Microempresa", desc: "Limite anual: R$ 360.000,00" },
            ].map((opt) => (
              <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
                <RadioGroupItem value={opt.value} className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </label>
            ))}
          </RadioGroup>
          <Button
            size="sm"
            className="h-9"
            disabled={taxRegimeLoading}
            onClick={async () => {
              if (!currentOrg?.id) return;
              setTaxRegimeLoading(true);
              try {
                const { error } = await supabase
                  .from("organizations")
                  .update({ tax_regime: taxRegime || null } as any)
                  .eq("id", currentOrg.id);
                if (error) throw error;
                await refreshOrganization();
                toast.success("Regime tributário salvo!");
              } catch {
                toast.error("Erro ao salvar regime tributário.");
              } finally {
                setTaxRegimeLoading(false);
              }
            }}
          >
            {taxRegimeLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando...</> : "Salvar regime"}
          </Button>
        </div>
      </div>

      {/* Change password */}
      <div className="dashboard-glass rounded-2xl overflow-hidden animate-dashboard-fade-in dash-delay-3">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Alterar senha</p>
        </div>
        <div className="px-4 py-4">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="new-pwd" className="text-sm font-medium">Nova senha</Label>
              <Input
                id="new-pwd"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1"
                minLength={6}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirm-pwd" className="text-sm font-medium">Confirmar nova senha</Label>
              <Input
                id="confirm-pwd"
                type="password"
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1"
                minLength={6}
                required
              />
            </div>
            <Button type="submit" disabled={pwdLoading} className="h-10">
              {pwdLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando...</> : "Alterar senha"}
            </Button>
          </form>
        </div>
      </div>

      {/* Danger zone */}
      <div className="dashboard-glass rounded-2xl overflow-hidden !border-destructive/30 animate-dashboard-fade-in dash-delay-4">
        <div className="px-4 py-3 border-b border-destructive/20 bg-destructive/5 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-destructive" />
          <p className="text-xs font-semibold uppercase tracking-wider text-destructive">Zona de Perigo</p>
        </div>
        <div className="px-4 py-4">
          <p className="text-sm text-muted-foreground mb-1 font-medium">Excluir minha conta</p>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            Ao excluir sua conta, sua lanchonete, cardápio e todas as sugestões de clientes serão perdidos permanentemente. Esta ação <strong>não pode ser desfeita</strong>.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={deleteLoading} className="h-10">
                {deleteLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Excluindo...</> : "Excluir minha conta"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Sua lanchonete e todas as sugestões serão perdidas permanentemente. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sim, excluir conta
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
