

## Correção: Bluetooth não encontra dispositivos + Notificações no APK

### Problema identificado

A tela "Procurando impressora..." aparece mas nunca lista dispositivos. Isso acontece porque:

1. **`androidNeverForLocation: true`** no `BleClient.initialize()` -- em muitos celulares Android (especialmente versão 11 e anteriores), o scanner BLE **precisa** da permissão de localização/GPS ativo para funcionar. Com essa flag ativada, o plugin pula esse pedido e o scanner não encontra nada.

2. **`requestDevice` sem `scanMode`** -- o plugin usa scan passivo por padrão, que pode ser muito lento para encontrar impressoras térmicas.

3. **Falta de tratamento de erro claro** -- quando o scanner falha silenciosamente, o usuário não recebe orientação.

4. **Notificações** -- o código foi atualizado corretamente, mas falta a configuração do plugin `LocalNotifications` no `capacitor.config.ts`.

---

### Correções planejadas

#### 1. `src/lib/nativeBluetooth.ts`
- Remover `androidNeverForLocation: true` do `BleClient.initialize()` para que o Android peça permissão de localização quando necessário
- Adicionar `scanMode: ScanMode.SCAN_MODE_LOW_LATENCY` no `requestDevice` para encontrar dispositivos mais rápido
- Adicionar tratamento de erro com mensagens claras (GPS desligado, permissão negada)

#### 2. `src/pages/DashboardPage.tsx`
- Melhorar o `catch` do `handlePairBluetooth` nativo com mensagens específicas para cada tipo de erro (permissão, GPS, etc.)

#### 3. `capacitor.config.ts`
- Adicionar configuração do `LocalNotifications` no bloco de plugins

---

### Detalhes técnicos

**nativeBluetooth.ts -- inicialização corrigida:**
```typescript
export async function initNativeBle(): Promise<void> {
  if (initialized) return;
  // Sem androidNeverForLocation para garantir compatibilidade com todos os Androids
  await BleClient.initialize();
  initialized = true;
}
```

**nativeBluetooth.ts -- scan mais rápido:**
```typescript
import { BleClient, ScanMode } from "@capacitor-community/bluetooth-le";

const device = await BleClient.requestDevice({
  optionalServices: ALT_SERVICE_UUIDS,
  scanMode: ScanMode.SCAN_MODE_LOW_LATENCY,
});
```

**DashboardPage.tsx -- erros claros no nativo:**
```typescript
} catch (err: any) {
  console.error("[NativeBT] Pair error:", err);
  const msg = err?.message || "";
  if (msg.includes("denied") || msg.includes("permission")) {
    toast.error("Permissão negada", {
      description: "Vá em Configurações > Apps > TrendFood > Permissões e ative Bluetooth e Localização.",
      duration: 8000,
    });
  } else if (msg.includes("disabled") || msg.includes("location")) {
    toast.error("Ative o GPS", {
      description: "O Bluetooth precisa da Localização ativada para encontrar impressoras.",
      duration: 8000,
    });
  } else {
    toast.error("Erro ao buscar impressora", {
      description: "Verifique se Bluetooth e GPS estão ligados.",
      duration: 8000,
    });
  }
}
```

**capacitor.config.ts -- adicionar LocalNotifications:**
```typescript
plugins: {
  BluetoothLe: { ... },
  LocalNotifications: {
    smallIcon: "ic_stat_icon_config_sample",
    iconColor: "#FF6B00",
  },
},
```

---

### Após a correção

Você vai precisar rodar no terminal:
```
cd trendfood
git pull
npm install
npm run build
npx cap sync
npx cap open android
```

Gerar novo APK e instalar. **Antes de testar**, certifique-se de que:
- Bluetooth está ligado
- GPS/Localização está ativado
- Na primeira vez, aceite as permissões que o app pedir

