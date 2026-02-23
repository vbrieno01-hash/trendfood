import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.trendfood.delivery",
  appName: "TrendFood",
  webDir: "dist",
  server: {
    url: "https://4930409c-277c-4049-bcfe-e466bb996cff.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  plugins: {
    BluetoothLe: {
      displayStrings: {
        scanning: "Procurando impressora...",
        cancel: "Cancelar",
        availableDevices: "Dispositivos disponíveis",
        noDeviceFound: "Nenhum dispositivo encontrado",
      },
    },
  },
};

export default config;
