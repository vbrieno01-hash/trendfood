import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { isBluetoothSupported, requestBluetoothPrinter, disconnectPrinter } from "@/lib/bluetoothPrinter";
import { enqueuePrint } from "@/lib/printQueue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, ShieldAlert, Mail, KeyRound, CreditCard, Zap, Share2, Copy, MessageCircle, Printer, Download } from "lucide-react";
import { toast } from "sonner";

export default function SettingsTab() {
  const { user, organization, signOut } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [printerWidth, setPrinterWidth] = useState<string>(
    (organization as any)?.printer_width || "58mm"
  );
  const [printerLoading, setPrinterLoading] = useState(false);
  const [printMode, setPrintMode] = useState<string>(
    (organization as any)?.print_mode || "browser"
  );
  const [printModeLoading, setPrintModeLoading] = useState(false);
  const [btDevice, setBtDevice] = useState<BluetoothDevice | null>(null);
  const [btConnected, setBtConnected] = useState(false);
  const [testPrintLoading, setTestPrintLoading] = useState(false);
  const btSupported = isBluetoothSupported();

  const currentPlan = organization?.subscription_plan || "free";
  const isFree = currentPlan === "free";

  const planLabels: Record<string, string> = {
    free: "Grátis",
    pro: "Pro",
    enterprise: "Enterprise",
  };

  const handleManageSubscription = () => {
    navigate("/planos");
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

  const handlePrinterWidthChange = async (value: string) => {
    if (!organization?.id) return;
    setPrinterWidth(value);
    setPrinterLoading(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ printer_width: value } as any)
        .eq("id", organization.id);
      if (error) throw error;
      toast.success("Largura da impressora atualizada!");
    } catch {
      toast.error("Erro ao salvar configuração.");
    } finally {
      setPrinterLoading(false);
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

  const handlePrintModeChange = async (value: string) => {
    if (!organization?.id) return;
    setPrintMode(value);
    setPrintModeLoading(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ print_mode: value } as any)
        .eq("id", organization.id);
      if (error) throw error;
      toast.success("Modo de impressão atualizado!");
    } catch {
      toast.error("Erro ao salvar configuração.");
    } finally {
      setPrintModeLoading(false);
    }
  };

  const handlePairBluetooth = async () => {
    const device = await requestBluetoothPrinter();
    if (device) {
      setBtDevice(device);
      setBtConnected(true);
      toast.success(`Impressora "${device.name || "Bluetooth"}" pareada!`);
      device.addEventListener("gattserverdisconnected", () => {
        setBtConnected(false);
      });
    }
  };

  const handleDisconnectBluetooth = () => {
    if (btDevice) {
      disconnectPrinter(btDevice);
      setBtDevice(null);
      setBtConnected(false);
      toast.info("Impressora desconectada.");
    }
  };

  const handleTestPrint = async () => {
    if (!organization?.id) return;
    setTestPrintLoading(true);
    try {
      const now = new Date().toLocaleString("pt-BR");
      const content = [
        "##CENTER## TESTE DE IMPRESSAO",
        "##CENTER## ==================",
        `##CENTER## ${organization.name || "TrendFood"}`,
        `##CENTER## ${now}`,
        "",
        "Tudo certo! Sua impressora",
        "esta configurada corretamente.",
        "",
        "##CENTER## ==================",
      ].join("\n");
      await enqueuePrint(organization.id, null, content);
      toast.success("Teste enviado para a fila de impressão!");
    } catch (err) {
      console.error("Erro ao testar impressora:", err);
      console.error("organization.id usado:", organization?.id);
      toast.error("Erro ao enviar teste de impressão. Veja o console para detalhes.");
    } finally {
      setTestPrintLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Gerencie sua conta e segurança</p>
      </div>

      {/* Account info */}
      <div className="rounded-xl border border-border overflow-hidden">
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

      {/* Subscription */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assinatura</p>
        </div>
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plano atual</p>
              <p className="text-sm font-medium text-foreground">{planLabels[currentPlan] || currentPlan}</p>
            </div>
          </div>
          <Button
            variant={isFree ? "default" : "outline"}
            size="sm"
            onClick={handleManageSubscription}
            className="h-9 gap-2"
          >
            {isFree ? (
              <><Zap className="w-4 h-4" /> Fazer upgrade</>
            ) : (
              "Trocar plano"
            )}
          </Button>
        </div>
      </div>

      {/* Share / Refer */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Indique o TrendFood</p>
        </div>
        <div className="px-4 py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Gostou do TrendFood? Compartilhe com outros empreendedores!
          </p>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value="https://trendfood.lovable.app"
              className="text-sm flex-1"
              onFocus={(e) => e.target.select()}
            />
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => {
                navigator.clipboard.writeText("https://trendfood.lovable.app");
                toast.success("Link copiado!");
              }}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            onClick={() => {
              const msg = encodeURIComponent("Cansado de perder tempo anotando pedido no papel? 📝 Conheça o TrendFood: o sistema que vai agilizar sua cozinha e organizar seu delivery em poucos cliques. 🚀\n\nConfira como funciona: https://trendfood.lovable.app");
              window.open(`https://wa.me/?text=${msg}`, "_blank");
            }}
          >
            <MessageCircle className="w-4 h-4" />
            Compartilhar via WhatsApp
          </Button>
        </div>
      </div>

      {/* Printer width */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <Printer className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Impressora</p>
        </div>
        <div className="px-4 py-4 space-y-4">
          {/* Print mode */}
          <div>
            <Label htmlFor="print-mode" className="text-sm font-medium">Modo de impressão</Label>
            <Select value={printMode} onValueChange={handlePrintModeChange} disabled={printModeLoading}>
              <SelectTrigger id="print-mode" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="browser">🖥️ Navegador (padrão)</SelectItem>
                <SelectItem value="desktop">💻 Desktop (Script externo)</SelectItem>
                {btSupported && (
                  <SelectItem value="bluetooth">📱 Mobile (Bluetooth)</SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1.5">
              {printMode === "browser" && "Os pedidos abrem uma janela de impressão no navegador."}
              {printMode === "desktop" && "Os pedidos são salvos na fila e um script externo captura e imprime."}
              {printMode === "bluetooth" && "Os pedidos são enviados diretamente para a impressora Bluetooth pareada."}
            </p>
          </div>

          {/* Bluetooth pairing */}
          {printMode === "bluetooth" && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Impressora Bluetooth</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  btConnected
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {btConnected ? `✓ ${btDevice?.name || "Conectada"}` : "Desconectada"}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handlePairBluetooth}
                >
                  <Printer className="w-3.5 h-3.5" />
                  {btConnected ? "Trocar impressora" : "Parear impressora"}
                </Button>
                {btConnected && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnectBluetooth}
                  >
                    Desconectar
                  </Button>
                )}
              </div>
              {!btSupported && (
                <p className="text-xs text-destructive">
                  Seu navegador não suporta Web Bluetooth. Use Chrome no Android ou Desktop.
                </p>
              )}
            </div>
          )}

          {/* Printer width */}
          <div>
            <Label htmlFor="printer-width" className="text-sm font-medium">Largura da impressora</Label>
            <Select value={printerWidth} onValueChange={handlePrinterWidthChange} disabled={printerLoading}>
              <SelectTrigger id="printer-width" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="58mm">58mm (portátil / Bluetooth)</SelectItem>
                <SelectItem value="80mm">80mm (balcão)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1.5">
              Escolha a largura do papel da sua impressora térmica.
            </p>
          </div>
        </div>
      </div>

      {/* Print setup */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <Printer className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Configuração de Impressão</p>
        </div>
        <div className="px-4 py-4 space-y-3">
          <div>
            <Label className="text-sm font-medium">ID da Loja</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                readOnly
                value={organization?.id || ""}
                className="text-sm flex-1 font-mono"
                onFocus={(e) => e.target.select()}
              />
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => {
                  if (organization?.id) {
                    navigator.clipboard.writeText(organization.id);
                    toast.success("ID copiado!");
                  }
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <Zap className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              Use este ID no seu programa de impressão TrendFood
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            disabled={testPrintLoading}
            onClick={handleTestPrint}
          >
            {testPrintLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : <><Printer className="w-4 h-4" /> Testar Impressora</>}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            asChild
          >
            <a href="https://trendfood.lovable.app/trendfood.exe" download>
              <Download className="w-4 h-4" />
              Baixar trendfood.exe
            </a>
          </Button>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Baixe o programa, abra-o e digite o ID acima para ativar a impressão automática.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
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
      <div className="rounded-xl border border-destructive/40 overflow-hidden">
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
