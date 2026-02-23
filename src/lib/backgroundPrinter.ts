import { registerPlugin } from "@capacitor/core";

export interface BackgroundPrinterPlugin {
  startService(options: {
    orgId: string;
    supabaseUrl: string;
    supabaseAnonKey: string;
    printerRobotToken: string;
    bleDeviceAddress: string;
  }): Promise<void>;
  stopService(): Promise<void>;
  isRunning(): Promise<{ running: boolean }>;
}

const BackgroundPrinter = registerPlugin<BackgroundPrinterPlugin>("BackgroundPrinter");

export async function startBackgroundPrinting(
  orgId: string,
  bleDeviceAddress: string
): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  // The PRINTER_ROBOT_TOKEN is stored as a Cloud secret and used by the edge function.
  // For the native service, we pass the anon key + org_id; the edge function validates via PRINTER_ROBOT_TOKEN.
  // We need to pass the token to the native service so it can authenticate with the edge function.
  const printerRobotToken = localStorage.getItem("printer_robot_token") || "";

  await BackgroundPrinter.startService({
    orgId,
    supabaseUrl,
    supabaseAnonKey,
    printerRobotToken,
    bleDeviceAddress,
  });
}

export async function stopBackgroundPrinting(): Promise<void> {
  await BackgroundPrinter.stopService();
}

export async function isBackgroundPrintingActive(): Promise<boolean> {
  const { running } = await BackgroundPrinter.isRunning();
  return running;
}
