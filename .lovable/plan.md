

## Plano: Reconstruir o projeto Android do zero

### Contexto
A pasta `android/` no repositorio contem apenas os arquivos Java customizados (BackgroundPrinterPlugin e PrinterForegroundService). O restante da estrutura nativa (build.gradle, AndroidManifest, MainActivity, etc.) e gerado localmente pelo Capacitor quando voce roda `npx cap add android`. Portanto, o que precisa ser feito no Lovable e limpar e recriar a configuracao base.

### O que sera feito

**1. Deletar a pasta `android/` inteira**
Remove os arquivos Java antigos. A pasta sera recriada pelo Capacitor no proximo `npx cap add android`.

**2. Reescrever `capacitor.config.ts` limpo**
Manter as mesmas configuracoes (appId, plugins de Bluetooth, SplashScreen, etc.) mas garantir que esta limpo e correto:

```ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.trendfood.delivery",
  appName: "TrendFood",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: false,
      backgroundColor: "#FFFFFF",
      showSpinner: false,
      launchFadeOutDuration: 500,
      splashFullScreen: true,
      splashImmersiveHidden: true,
    },
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
```

**3. Recriar os arquivos Java customizados**
Apos o `npx cap add android` gerar a estrutura, os dois arquivos Java (BackgroundPrinterPlugin.java e PrinterForegroundService.java) serao recriados no caminho correto com o mesmo conteudo.

### Passos que voce precisara executar no terminal

Apos eu aplicar as mudancas, voce faz no seu computador:

```
git pull
npm install
npm run build
npx cap add android
npx cap sync
```

Depois, copie os arquivos Java gerados para `android/app/src/main/java/app/trendfood/delivery/` e registre o plugin no `MainActivity.java`.

Por fim, gere o APK:
```
cd android
.\gradlew.bat assembleDebug
```

O APK estara em `android/app/build/outputs/apk/debug/app-debug.apk`.

### Arquivos alterados
- **Deletar**: toda a pasta `android/`
- **Recriar**: `android/app/src/main/java/app/trendfood/delivery/BackgroundPrinterPlugin.java`
- **Recriar**: `android/app/src/main/java/app/trendfood/delivery/PrinterForegroundService.java`
- **Manter**: `capacitor.config.ts` (sem alteracoes necessarias, ja esta correto)

