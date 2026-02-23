

## Correção: Bluetooth e Notificações no APK Nativo

### Problema 1: Bluetooth fica "procurando" sem conectar
Quando o app roda como APK (Capacitor), a funcao `requestBluetoothPrinter()` usa o plugin nativo e ja conecta a impressora internamente. Porem, o `handlePairBluetooth` no `DashboardPage` tenta chamar `connectToDevice(device)` no objeto retornado -- que e um objeto fake sem metodo `.gatt.connect()` real. Isso causa erro silencioso e a impressora nunca aparece como "conectada".

**Solucao**: Detectar plataforma nativa no `handlePairBluetooth` e pular a etapa `connectToDevice`, ja que a conexao nativa ja foi feita.

### Problema 2: Notificacoes nao funcionam
A API `Notification.requestPermission()` do navegador nao funciona corretamente dentro do WebView do Capacitor. O dialogo de permissao nunca aparece.

**Solucao**: Usar o plugin `@capacitor/local-notifications` para disparar notificacoes nativas no Android. Quando detectar plataforma nativa, usar o plugin ao inves da API web.

---

### Arquivos a modificar

#### 1. `src/pages/DashboardPage.tsx`
- Na funcao `handlePairBluetooth`: adicionar check `isNativePlatform()`. Se nativo, pular `connectToDevice()` e marcar como conectado direto apos `requestBluetoothPrinter()` retornar com sucesso.
- Na logica de notificacoes: usar `LocalNotifications` do Capacitor quando em plataforma nativa.

#### 2. `src/components/dashboard/KitchenTab.tsx`
- Na funcao `handleToggleNotifications`: usar `LocalNotifications.requestPermissions()` quando nativo ao inves de `Notification.requestPermission()`.

#### 3. Instalar dependencia
- Adicionar `@capacitor/local-notifications` ao projeto.

---

### Detalhes tecnicos

**Bluetooth fix no `handlePairBluetooth`:**
```typescript
const device = await requestBluetoothPrinter();
if (device) {
  setBtDevice(device);
  if (isNativePlatform()) {
    // Native BLE ja conectou internamente
    setBtConnected(true);
    setBtReconnectFailed(false);
    toast.success(`Impressora conectada!`);
  } else {
    // Web: precisa conectar GATT manualmente
    toast.info("Conectando a impressora...");
    const char = await connectToDevice(device);
    // ... resto do fluxo web
  }
}
```

**Notificacoes nativas:**
```typescript
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

// Ao receber novo pedido:
if (isNativePlatform()) {
  await LocalNotifications.schedule({
    notifications: [{
      title: "Novo pedido!",
      body: `Mesa ${order.table_number}`,
      id: Date.now(),
    }]
  });
} else {
  new Notification("Novo pedido!", { ... });
}
```

**Auto-reconnect nativo:**
- A funcao `reconnectStoredPrinter()` ja trata o caminho nativo corretamente usando `reconnectNativeDevice()`.
- O `attachDisconnectHandler` precisa ser pulado no nativo (o fake device nao emite eventos `gattserverdisconnected`).

