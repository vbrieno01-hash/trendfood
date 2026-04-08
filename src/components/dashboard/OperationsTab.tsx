import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, BellRing } from "lucide-react";
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
  return (
    <Tabs defaultValue="kitchen" className="w-full">
      <TabsList className="w-full grid grid-cols-2 mb-4">
        <TabsTrigger value="kitchen" className="gap-2">
          <Flame className="w-4 h-4" />
          Cozinha
        </TabsTrigger>
        <TabsTrigger value="orders" className="gap-2">
          <BellRing className="w-4 h-4" />
          Gestão
        </TabsTrigger>
      </TabsList>

      <TabsContent value="kitchen">
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
          autoPrint={props.autoPrint}
          onToggleAutoPrint={props.onToggleAutoPrint}
          notificationsEnabled={props.notificationsEnabled}
          onToggleNotifications={props.onToggleNotifications}
          whatsapp={props.whatsapp}
          pixConfirmationMode={props.pixConfirmationMode}
        />
      </TabsContent>

      <TabsContent value="orders">
        <WaiterTab
          embedded
          orgId={props.orgId}
          orgName={props.orgName}
          whatsapp={props.whatsapp}
          pixConfirmationMode={props.pixConfirmationMode}
          pixKey={props.pixKey}
          storeAddress={props.storeAddress}
          courierConfig={props.courierConfig}
          printMode={props.printMode}
          printerWidth={props.printerWidth}
          btDevice={props.btDevice}
          onPairBluetooth={props.onPairBluetooth}
          btConnected={props.btConnected}
          btSupported={props.btSupported}
          autoPrint={props.autoPrint}
          onToggleAutoPrint={props.onToggleAutoPrint}
          notificationsEnabled={props.notificationsEnabled}
          onToggleNotifications={props.onToggleNotifications}
        />
      </TabsContent>
    </Tabs>
  );
}
