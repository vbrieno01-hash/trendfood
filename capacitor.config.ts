import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.trendfood.delivery",
  appName: "TrendFood",
  webDir: "dist",
  server: {
    androidScheme: "https",
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
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#FF6B00",
    },
  },
};

export default config;
