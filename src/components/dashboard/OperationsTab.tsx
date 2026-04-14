import { Flame, BellRing, Clock, Printer } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import KitchenTab from "./KitchenTab";
import WaiterTab from "./WaiterTab";

interface OperationsTabProps {
  orgId: string;
  orgName?: string;
  orgSlug?: string;
  storeAddress?: string | null;
  courierConfig?: { base_fee: number; per_km: number } | null;
  printMode?: 'browser' | 'desktop' | 'bluetooth';
  printerWidth?: '58mm' | '80mm';
  btDevice?: BluetoothDevice | null;
  pixKey?: string | null;
  onPairBluetooth?: () => void;
  btConnected?: boolean;
  btSupported?: boolean;
  btPairing?: boolean;
  autoPrint: boolean;
  onToggleAutoPrint: (val: boolean) => void;
  notificationsEnabled: boolean;
  onToggleNotifications: (val: boolean) => void;
  whatsapp?: string | null;
  pixConfirmationMode?: "direct" | "manual" | "automatic";
}

export default function OperationsTab(props: OperationsTabProps) {
  const waiterSharedProps = {
    orgId: props.orgId,
    orgName: props.orgName,
    whatsapp: props.whatsapp,
    pixConfirmationMode: props.pixConfirmationMode,
    pixKey: props.pixKey,
    storeAddress: props.storeAddress,
    courierConfig: props.courierConfig,
    printMode: props.printMode,
    printerWidth: props.printerWidth,
    btDevice: props.btDevice,
    onPairBluetooth: props.onPairBluetooth,
    btConnected: props.btConnected,
    btSupported: props.btSupported,
    autoPrint: props.autoPrint,
    onToggleAutoPrint: props.onToggleAutoPrint,
    notificationsEnabled: props.notificationsEnabled,
    onToggleNotifications: props.onToggleNotifications,
    embedded: true,
  } as const;

  return (
    <div className="w-full space-y-4">
      {/* Shared controls bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 animate-dashboard-fade-in">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-foreground text-xl">Operações</h2>
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ao vivo
          </span>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label htmlFor="notif-ops" className="text-xs text-muted-foreground cursor-pointer select-none">
              🔔 Notificações
            </Label>
            <Switch
              id="notif-ops"
              checked={props.notificationsEnabled}
              onCheckedChange={props.onToggleNotifications}
            />
          </div>
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-muted-foreground" />
            <Label htmlFor="auto-print-ops" className="text-xs text-muted-foreground cursor-pointer select-none">
              Imprimir automático
            </Label>
            <Switch
              id="auto-print-ops"
              checked={props.autoPrint}
              onCheckedChange={props.onToggleAutoPrint}
            />
          </div>
        </div>
      </div>

      {/* 3-column grid on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Column 1: Cozinha (pendentes + preparando) */}
        <div className="rounded-2xl border border-border bg-card/50 p-4 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto">
          <div className="flex items-center gap-2 mb-4 sticky top-0 bg-card/80 backdrop-blur-sm py-2 -mt-2 -mx-4 px-4 z-10 rounded-t-2xl border-b border-border">
            <Flame className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-foreground">Cozinha</h3>
          </div>
          <KitchenTab
            embedded
            orgId={props.orgId}
            orgName={props.orgName}
            orgSlug={props.orgSlug}
            storeAddress={props.storeAddress}
            courierConfig={props.courierConfig}
            printMode={props.printMode}
            printerWidth={props.printerWidth}
            btDevice={props.btDevice}
            pixKey={props.pixKey}
            onPairBluetooth={props.onPairBluetooth}
            btConnected={props.btConnected}
            btSupported={props.btSupported}
            btPairing={props.btPairing}
            autoPrint={props.autoPrint}
            onToggleAutoPrint={props.onToggleAutoPrint}
            notificationsEnabled={props.notificationsEnabled}
            onToggleNotifications={props.onToggleNotifications}
            whatsapp={props.whatsapp}
            pixConfirmationMode={props.pixConfirmationMode}
          />
        </div>

        {/* Column 2: Prontos para Entrega */}
        <div className="rounded-2xl border border-border bg-card/50 p-4 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto">
          <div className="flex items-center gap-2 mb-4 sticky top-0 bg-card/80 backdrop-blur-sm py-2 -mt-2 -mx-4 px-4 z-10 rounded-t-2xl border-b border-border">
            <BellRing className="w-5 h-5 text-green-500" />
            <h3 className="font-bold text-foreground">Prontos</h3>
          </div>
          <WaiterTab
            {...waiterSharedProps}
            section="ready"
          />
        </div>

        {/* Column 3: Aguardando Pagamento */}
        <div className="rounded-2xl border border-border bg-card/50 p-4 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto">
          <div className="flex items-center gap-2 mb-4 sticky top-0 bg-card/80 backdrop-blur-sm py-2 -mt-2 -mx-4 px-4 z-10 rounded-t-2xl border-b border-border">
            <Clock className="w-5 h-5 text-yellow-500" />
            <h3 className="font-bold text-foreground">Pagamento</h3>
          </div>
          <WaiterTab
            {...waiterSharedProps}
            section="unpaid"
          />
        </div>
      </div>
    </div>
  );
}
