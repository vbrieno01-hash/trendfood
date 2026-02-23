import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { enqueuePrint } from "@/lib/printQueue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Printer, Download, Copy, Zap, AlertTriangle, FileText } from "lucide-react";
import { toast } from "sonner";
import ReceiptPreview from "./ReceiptPreview";

interface PrinterTabProps {
  btDevice: BluetoothDevice | null;
  btConnected: boolean;
  onPairBluetooth: () => void;
  onDisconnectBluetooth: () => void;
  btSupported: boolean;
}

export default function PrinterTab({ btDevice, btConnected, onPairBluetooth, onDisconnectBluetooth, btSupported }: PrinterTabProps) {
  const { organization } = useAuth();

  const [printerWidth, setPrinterWidth] = useState<string>(
    (organization as any)?.printer_width || "58mm"
  );
  const [printerLoading, setPrinterLoading] = useState(false);
  const [printMode, setPrintMode] = useState<string>(
    (organization as any)?.print_mode || "browser"
  );
  const [printModeLoading, setPrintModeLoading] = useState(false);
  const [testPrintLoading, setTestPrintLoading] = useState(false);

  // Comanda header fields
  const [rcpName, setRcpName] = useState((organization as any)?.name || "");
  const [rcpAddress, setRcpAddress] = useState((organization as any)?.store_address || "");
  const [rcpContact, setRcpContact] = useState((organization as any)?.whatsapp || "");
  const [rcpCnpj, setRcpCnpj] = useState((organization as any)?.cnpj || "");

  const handleFieldBlur = async (field: string, value: string) => {
    if (!organization?.id) return;
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ [field]: value || null } as any)
        .eq("id", organization.id);
      if (error) throw error;
      toast.success("Salvo!");
    } catch {
      toast.error("Erro ao salvar.");
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
        .eq("user_id", organization.user_id);
      if (error) throw error;
      toast.success("Largura da impressora atualizada!");
    } catch {
      toast.error("Erro ao salvar configuração.");
    } finally {
      setPrinterLoading(false);
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
        .eq("user_id", organization.user_id);
      if (error) throw error;
      toast.success("Modo de impressão atualizado!");
    } catch {
      toast.error("Erro ao salvar configuração.");
    } finally {
      setPrintModeLoading(false);
    }
  };

  const handleTestPrint = async () => {
    if (!organization?.id) {
      toast.error("Organização não encontrada. Recarregue a página e tente novamente.");
      return;
    }
    setTestPrintLoading(true);
    try {
      const now = new Date().toLocaleString("pt-BR");
      const content = [
        "   TESTE DE IMPRESSAO",
        "================================",
        `   ${organization.name || "TrendFood"}`,
        `   ${now}`,
        "",
        "Tudo certo! Sua impressora",
        "esta configurada corretamente.",
        "",
        "================================",
      ].join("\n");
      await enqueuePrint(organization.id, null, content);
      toast.success("Teste enviado para a fila de impressão!");
    } catch (err: any) {
      console.error("Erro ao testar impressora:", err);
      const msg = err?.message || "Erro desconhecido";
      toast.error(`Falha ao enviar teste: ${msg}`);
    } finally {
      setTestPrintLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Impressora Térmica</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Configure o modo e hardware de impressão</p>
      </div>

      {/* Print mode & width */}
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
                <SelectItem value="bluetooth">📱 Mobile (Bluetooth)</SelectItem>
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
              {!btSupported && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-amber-800 font-medium">
                      Web Bluetooth não está disponível
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      {(navigator as any).brave
                        ? <>Ative o Web Bluetooth em <strong>brave://flags/#enable-web-bluetooth</strong> e recarregue a página.</>
                        : <>Use <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong> ou <strong>Opera</strong> para parear impressoras Bluetooth.</>
                      }
                    </p>
                  </div>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2"
                asChild
              >
                <a href="https://github.com/vbrieno01-hash/trendfood/releases/latest/download/trendfood.apk" download>
                  <Download className="w-4 h-4" />
                  Baixar TrendFood.apk
                </a>
              </Button>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Baixe e instale o app Android para imprimir via Bluetooth.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    if (!btSupported) {
                      const isBrave = !!(navigator as any).brave;
                      toast.error(
                        isBrave ? "Bluetooth desativado no Brave" : "Bluetooth não disponível",
                        {
                          description: isBrave
                            ? "Ative em brave://flags/#enable-web-bluetooth e recarregue a página."
                            : "Seu navegador não suporta Web Bluetooth. Use Chrome, Edge ou Opera.",
                          duration: 8000,
                        }
                      );
                      return;
                    }
                    onPairBluetooth();
                  }}
                >
                  <Printer className="w-3.5 h-3.5" />
                  {btConnected ? "Trocar impressora" : "Parear impressora"}
                </Button>
                {btConnected && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDisconnectBluetooth}
                  >
                    Desconectar
                  </Button>
                )}
              </div>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Configuração de Impressão Desktop</p>
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
            <a href="https://github.com/vbrieno01-hash/trendfood/releases/latest/download/trendfood.exe" download>
              <Download className="w-4 h-4" />
              Baixar trendfood.exe
            </a>
          </Button>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Baixe o programa, abra-o e digite o ID acima para ativar a impressão automática.
          </p>
        </div>
      </div>

      {/* Comanda */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comanda</p>
        </div>
        <div className="px-4 py-4 space-y-4">
          <p className="text-sm text-muted-foreground">Edite os dados da loja que aparecem no cabeçalho da comanda. O preview atualiza em tempo real.</p>

          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Nome da Loja</Label>
              <Input
                className="mt-1"
                value={rcpName}
                onChange={(e) => setRcpName(e.target.value)}
                onBlur={() => handleFieldBlur("name", rcpName)}
                placeholder="Nome da loja"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Endereço</Label>
              <Input
                className="mt-1"
                value={rcpAddress}
                onChange={(e) => setRcpAddress(e.target.value)}
                onBlur={() => handleFieldBlur("store_address", rcpAddress)}
                placeholder="Endereço da loja"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Contato (WhatsApp)</Label>
              <Input
                className="mt-1"
                value={rcpContact}
                onChange={(e) => setRcpContact(e.target.value)}
                onBlur={() => handleFieldBlur("whatsapp", rcpContact)}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">CNPJ</Label>
              <Input
                className="mt-1"
                value={rcpCnpj}
                onChange={(e) => setRcpCnpj(e.target.value)}
                onBlur={() => handleFieldBlur("cnpj", rcpCnpj)}
                placeholder="00.000.000/0000-00"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Preview da Comanda</p>
            <ReceiptPreview
              storeName={rcpName}
              storeAddress={rcpAddress}
              storeContact={rcpContact}
              cnpj={rcpCnpj}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
