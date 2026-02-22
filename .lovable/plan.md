

# Suportar Web Bluetooth em mais navegadores (incluindo Brave)

## Contexto

O Web Bluetooth funciona nativamente no Chrome, Edge e Opera. O Brave **tem suporte**, mas desativa por padrão. Firefox e Safari **nao suportam**.

As mensagens atuais dizem "Abra no Google Chrome", o que e incorreto -- e preciso orientar corretamente cada caso.

## Mudancas

### 1. `src/lib/bluetoothPrinter.ts` — Detectar Brave especificamente

Criar uma funcao auxiliar `getBrowserBluetoothStatus()` que retorna:
- `"supported"` — API disponivel
- `"brave"` — Brave detectado (via `navigator.brave`) mas BT desativado
- `"unsupported"` — navegador sem suporte

```typescript
export function getBluetoothStatus(): "supported" | "brave-disabled" | "unsupported" {
  if (isBluetoothSupported()) return "supported";
  if ((navigator as any).brave) return "brave-disabled";
  return "unsupported";
}
```

### 2. `src/components/dashboard/KitchenTab.tsx` — Toast especifico por navegador

No `onClick` do botao de parear, usar `getBluetoothStatus()` para mostrar mensagens diferentes:
- **Brave**: "Ative o Web Bluetooth em brave://flags/#enable-web-bluetooth e recarregue a pagina."
- **Outros**: "Use o Google Chrome, Microsoft Edge ou Opera para parear impressoras Bluetooth."

### 3. `src/components/dashboard/SettingsTab.tsx` — Mesma logica

- Atualizar o aviso amarelo (AlertTriangle) para mostrar instrucoes especificas para Brave
- Atualizar o toast do botao "Parear impressora"
- **Sempre mostrar** a opcao "Bluetooth" no select de modo de impressao (remover o `{btSupported && ...}`) para que o usuario saiba que existe, mesmo que precise ajustar o navegador

### 4. `src/pages/KitchenPage.tsx` — Mesma logica

- Atualizar o `handlePairBluetooth` com as mensagens especificas por navegador

### 5. `src/pages/DashboardPage.tsx` — Atualizar toast de erro

- Atualizar a mensagem no `handlePairBluetooth` para usar as instrucoes por navegador

## Mensagens finais

**Brave detectado:**
> "Bluetooth desativado no Brave. Ative em brave://flags/#enable-web-bluetooth e recarregue a pagina."

**Outro navegador sem suporte:**
> "Seu navegador nao suporta Web Bluetooth. Use Chrome, Edge ou Opera."

## Arquivos alterados
- `src/lib/bluetoothPrinter.ts` — nova funcao `getBluetoothStatus()`
- `src/components/dashboard/KitchenTab.tsx` — toast por navegador
- `src/components/dashboard/SettingsTab.tsx` — aviso e select atualizados
- `src/pages/KitchenPage.tsx` — toast por navegador
- `src/pages/DashboardPage.tsx` — toast por navegador
