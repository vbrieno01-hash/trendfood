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
  ifoodCourierCopy?: boolean;
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
    ifoodCourierCopy: props.ifoodCourierCopy,
  } as const;

  return (
    <div className="w-full space-y-4">
      {/* Shared controls bar */}
      <div className="cmd-panel p-4 flex items-center justify-between flex-wrap gap-3 animate-dashboard-fade-in">
        <span aria-hidden className="cmd-scanline" />
        <div className="flex items-center gap-3">
          <div className="section-eyebrow"><Flame className="w-3 h-3" /> Central de Produção</div>
          <h2 className="font-display font-bold text-foreground text-xl tracking-tight">Operações</h2>
          <span className="status-pill status-pill--live">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Ao vivo
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
        <div className="cmd-panel cmd-panel--accent relative p-4 lg:max-h-[calc(100vh-240px)] lg:overflow-y-auto overflow-hidden">
          <span aria-hidden className="cmd-scanline" />
          <div className="flex items-center justify-between gap-2 mb-4 sticky top-0 bg-card/80 backdrop-blur-md py-2 -mt-2 -mx-4 px-4 z-10 border-b border-border">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-primary" />
              <h3 className="font-display font-bold text-foreground tracking-tight uppercase text-sm">Cozinha</h3>
            </div>
            <span className="status-pill status-pill--accent">Novos</span>
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
            ifoodCourierCopy={props.ifoodCourierCopy}
          />
        </div>

        {/* Column 2: Prontos para Entrega */}
        <div className="cmd-panel cmd-panel--success relative p-4 lg:max-h-[calc(100vh-240px)] lg:overflow-y-auto overflow-hidden">
          <span aria-hidden className="cmd-scanline" style={{ background: "linear-gradient(90deg, transparent, hsl(142 70% 45%), transparent)" }} />
          <div className="flex items-center justify-between gap-2 mb-4 sticky top-0 bg-card/80 backdrop-blur-md py-2 -mt-2 -mx-4 px-4 z-10 border-b border-border">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-emerald-400" />
              <h3 className="font-display font-bold text-foreground tracking-tight uppercase text-sm">Prontos</h3>
            </div>
            <span className="status-pill status-pill--live">Entregar</span>
          </div>
          <WaiterTab
            {...waiterSharedProps}
            section="ready"
          />
        </div>

        {/* Column 3: Aguardando Pagamento */}
        <div className="cmd-panel relative p-4 lg:max-h-[calc(100vh-240px)] lg:overflow-y-auto overflow-hidden" style={{ borderColor: "hsl(38 95% 50% / 0.35)" }}>
          <span aria-hidden className="cmd-scanline" style={{ background: "linear-gradient(90deg, transparent, hsl(38 95% 50%), transparent)" }} />
          <div className="flex items-center justify-between gap-2 mb-4 sticky top-0 bg-card/80 backdrop-blur-md py-2 -mt-2 -mx-4 px-4 z-10 border-b border-border">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="font-display font-bold text-foreground tracking-tight uppercase text-sm">Pagamento</h3>
            </div>
            <span className="status-pill status-pill--warn">Aguardando</span>
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
