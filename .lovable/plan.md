

## Correção: Impressão automática no APK (Capacitor/Android)

### Problema raiz

No APK, o Android frequentemente desconecta o Bluetooth em segundo plano. Quando um pedido novo chega, o sistema tenta imprimir automaticamente mas:

1. A conexao BLE nativa ja caiu (variaveis em memoria ficaram null)
2. A reconexao automatica falha silenciosamente
3. O pedido cai na fila de impressao (`fila_impressao`), mas no APK ninguem consome essa fila
4. Resultado: nada imprime ate voce clicar manualmente

### Correcoes planejadas

#### 1. `src/lib/nativeBluetooth.ts` -- Reconexao mais robusta

- Adicionar reconexao com retry (3 tentativas com backoff) dentro de `sendToNativePrinter`
- Usar os UUIDs de service/characteristic salvos no localStorage para reconexao rapida (sem re-descoberta)
- Adicionar logs mais detalhados para debug

#### 2. `src/pages/DashboardPage.tsx` -- Auto-reconnect nativo antes de imprimir

- No callback de auto-print, quando `isNativePlatform()`, chamar `reconnectNativeDevice()` diretamente em vez de usar o shim de `reconnectStoredPrinter()` que retorna um fake device
- Garantir que o `btDeviceRef` seja atualizado apos reconexao nativa

#### 3. `src/lib/nativeBluetooth.ts` -- Keepalive periodico

- Adicionar funcao `ensureNativeConnection()` que verifica se a conexao BLE esta ativa e reconecta se necessario
- Chamar essa funcao antes de cada impressao

#### 4. `src/pages/DashboardPage.tsx` -- Polling da fila no APK

- Quando `isNativePlatform()`, adicionar um polling a cada 10s que verifica a tabela `fila_impressao` por itens pendentes
- Se encontrar itens pendentes e a impressora estiver conectada, imprime e marca como "impresso"
- Isso serve como fallback: se a impressao direta falhou, o polling pega o pedido da fila

---

### Detalhes tecnicos

**nativeBluetooth.ts -- reconexao com retry:**
```typescript
export async function sendToNativePrinter(text: string): Promise<boolean> {
  // Tenta ate 3 vezes reconectar antes de desistir
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!connectedDeviceId || !cachedServiceUuid || !cachedCharUuid) {
      console.warn(`[NativeBT] Not connected, reconnect attempt ${attempt + 1}/3...`);
      const reconnected = await reconnectNativeDevice();
      if (!reconnected) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
    }
    
    try {
      // ... enviar dados BLE ...
      return true;
    } catch (err) {
      console.error(`[NativeBT] Print attempt ${attempt + 1} failed:`, err);
      // Limpa estado para forcar reconexao na proxima tentativa
      connectedDeviceId = null;
      cachedServiceUuid = null;
      cachedCharUuid = null;
    }
  }
  return false;
}
```

**nativeBluetooth.ts -- reconexao rapida usando UUIDs salvos:**
```typescript
export async function reconnectNativeDevice(): Promise<string | null> {
  const storedId = localStorage.getItem(STORED_NATIVE_DEVICE_KEY);
  const storedService = localStorage.getItem(STORED_NATIVE_SERVICE_KEY);
  const storedChar = localStorage.getItem(STORED_NATIVE_CHAR_KEY);
  if (!storedId) return null;

  try {
    await initNativeBle();
    await BleClient.connect(storedId, (id) => {
      console.log("[NativeBT] Disconnected:", id);
      connectedDeviceId = null;
    });

    // Fast path: usar UUIDs ja conhecidos sem re-descobrir
    if (storedService && storedChar) {
      connectedDeviceId = storedId;
      cachedServiceUuid = storedService;
      cachedCharUuid = storedChar;
      return storedId;
    }

    // Slow path: re-descobrir servicos
    const ok = await connectNativeDevice(storedId);
    return ok ? storedId : null;
  } catch (err) {
    console.error("[NativeBT] Reconnect failed:", err);
    return null;
  }
}
```

**DashboardPage.tsx -- polling da fila como fallback nativo:**
```typescript
// Polling fila_impressao no APK como fallback
useEffect(() => {
  if (!isNativePlatform() || !orgId) return;
  
  const interval = setInterval(async () => {
    try {
      const native = await import("@/lib/nativeBluetooth");
      if (!native.isNativeConnected()) return;
      
      const { data } = await supabase
        .from("fila_impressao")
        .select("*")
        .eq("organization_id", orgId)
        .eq("status", "pendente")
        .order("created_at", { ascending: true })
        .limit(5);
      
      if (!data?.length) return;
      
      for (const job of data) {
        const ok = await native.sendToNativePrinter(job.conteudo_txt);
        if (ok) {
          await supabase
            .from("fila_impressao")
            .update({ status: "impresso", printed_at: new Date().toISOString() })
            .eq("id", job.id);
        }
      }
    } catch (err) {
      console.error("[APK] Queue poll error:", err);
    }
  }, 10000);
  
  return () => clearInterval(interval);
}, [orgId]);
```

### Resultado esperado

- Impressao automatica funciona no APK mesmo apos desconexao BLE temporaria
- Se a impressao direta falhar, o polling da fila pega o pedido em ate 10 segundos
- Reconexao BLE nativa mais rapida usando UUIDs ja salvos
- Logs detalhados para debug futuro

### Apos a correcao

Rodar no terminal:
```
cd trendfood
git pull
npm install
npm run build
npx cap sync
npx cap open android
```

Gerar novo APK no Android Studio e testar.
