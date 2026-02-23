

# Corrigir Crash do APK - Parte 2: Proteger DashboardPage

## Contexto

As correções anteriores (try/catch no useAuth, AuthPage e App.tsx) já foram aplicadas, mas o APK continua fechando. O crash agora acontece quando o app navega para o `/dashboard` após o login.

## Causa raiz

O `DashboardPage` executa código pesado e potencialmente incompatível com o WebView Android **imediatamente na montagem**:

1. **Linha 67**: `useState<BluetoothDevice | null>` - O tipo `BluetoothDevice` pode não existir no WebView do Android (só existe em navegadores com Web Bluetooth). Isso causa um `ReferenceError` fatal.
2. **Linha 70**: `isBluetoothSupported()` é chamado no topo do componente sem proteção.
3. **Linhas 441, 461-462**: Referências a `BluetoothDevice` como tipo em callbacks.
4. **Linha 73**: `usePushNotifications()` executa antes de confirmar autenticação.
5. **Linha 449**: `reconnectStoredPrinter()` executa em useEffect sem guard de autenticação.

## Solução

### 1. Trocar tipo BluetoothDevice por `any` (DashboardPage.tsx)

```typescript
// Linha 67 - Antes:
const [btDevice, setBtDevice] = useState<BluetoothDevice | null>(null);

// Depois:
const [btDevice, setBtDevice] = useState<any>(null);
```

### 2. Proteger `isBluetoothSupported()` com try/catch (DashboardPage.tsx)

```typescript
// Linha 70 - Antes:
const btSupported = isBluetoothSupported();

// Depois:
const btSupported = (() => { try { return isBluetoothSupported(); } catch { return false; } })();
```

### 3. Remover referências a `BluetoothDevice` nos callbacks (DashboardPage.tsx)

Trocar `BluetoothDevice` por `any` nas linhas 441, 461, 462.

### 4. Adicionar guard de autenticação no useEffect de Bluetooth auto-reconnect

```typescript
// Adicionar no início do useEffect (por volta da linha 430):
useEffect(() => {
  if (loading || !user) return;  // <-- guard adicionado
  if (btDevice) return;
  // ... resto do código
}, [loading, user]); // <-- adicionar dependências
```

### 5. Proteger o bloco inteiro de auto-reconnect com try/catch

Envolver todo o corpo do useEffect de Bluetooth em try/catch para que qualquer erro nativo não derrube o app.

## Bluetooth continua funcionando?

**Sim!** Essas mudanças são apenas de segurança:
- O tipo `any` substitui `BluetoothDevice` apenas na declaração TypeScript, sem afetar o comportamento
- No APK nativo, o sistema já usa `@capacitor-community/bluetooth-le` (via `nativeBluetooth.ts`), que não depende do tipo `BluetoothDevice` do navegador
- Os guards apenas atrasam a execução até o login estar confirmado

## Arquivos modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/DashboardPage.tsx` | Trocar `BluetoothDevice` por `any`, proteger `isBluetoothSupported()`, adicionar guards de auth nos useEffects pesados, envolver auto-reconnect em try/catch |

## Resultado esperado

O APK não vai mais fechar ao fazer login. O Bluetooth continuará funcionando normalmente tanto no modo nativo (Capacitor BLE) quanto no modo web.

