

# Plano: Remover tudo relacionado ao APK / Android / Capacitor

## O que será removido

### Arquivos deletados
- `capacitor.config.ts`
- `src/lib/backgroundPrinter.ts`
- `src/lib/nativeBluetooth.ts`
- `src/lib/nativeCamera.ts`
- `src/lib/nativeShare.ts`
- `android/app/src/main/java/app/trendfood/delivery/BackgroundPrinterPlugin.java`
- `android/app/src/main/java/app/trendfood/delivery/PrinterForegroundService.java`

### Arquivos editados (remover referências Capacitor)
1. **`src/App.tsx`** — remover imports do Capacitor/SplashScreen, remover `isNativePlatform()` checks, rota `/` sempre mostra `<Index />`
2. **`src/pages/AuthPage.tsx`** — remover import Capacitor, tab padrão sempre "signup"
3. **`src/lib/bluetoothPrinter.ts`** — remover toda lógica nativa, manter só Web Bluetooth
4. **`src/lib/printOrder.ts`** — remover fallback nativo, manter só impressão web
5. **`src/components/dashboard/PrinterTab.tsx`** — remover imports e lógica do background printer nativo
6. **`src/components/dashboard/ReportsTab.tsx`** — remover import `nativeShare`, usar `navigator.share` padrão ou remover
7. **`src/pages/DashboardPage.tsx`** — remover imports e lógica de `nativeBluetooth`

### Dependências removidas do `package.json`
- `@capacitor/core`
- `@capacitor/cli`
- `@capacitor/android`
- `@capacitor/app`
- `@capacitor/camera`
- `@capacitor/filesystem`
- `@capacitor/splash-screen`
- `@capacitor/share`
- `@capacitor/local-notifications`
- `@capacitor-community/bluetooth-le`
- `@types/web-bluetooth`

## O que NÃO será afetado
- Toda a interface web (cardápio, pedidos, caixa, etc.)
- Impressão via Web Bluetooth (navegador) continua funcionando
- Fila de impressão na nuvem continua funcionando
- PWA (se configurado) continua funcionando

## Seção técnica
```text
Impacto: ~14 arquivos modificados/deletados
Risco: baixo — todas as funcionalidades nativas tinham fallback web
Resultado: app 100% web, sem dependência de Capacitor
Reconstrução futura: quando tiver créditos, basta reinstalar Capacitor + recriar os arquivos nativos
```

