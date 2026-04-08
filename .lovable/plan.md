

## Plano: Simular alerta de Bluetooth indisponível

### O que fazer
Adicionar um override temporário no `PrinterTab.tsx` para forçar o estado de Bluetooth como indisponível, permitindo visualizar o banner amarelo no preview.

### Alteração

**`src/components/dashboard/PrinterTab.tsx`** — Na linha onde `getBluetoothStatus()` é chamado, substituir temporariamente por um valor fixo:

```typescript
// TEMPORÁRIO — remover após teste visual
const btStatus = { supported: false, reason: "ios" as const };
// const btStatus = getBluetoothStatus(); // original
```

Isso força o banner amarelo a aparecer com a mensagem de iOS como exemplo. Pode trocar `"ios"` por `"webview"`, `"firefox"`, `"brave-disabled"` ou `"unsupported"` para ver cada variante.

### Depois do teste
Reverter para `const btStatus = getBluetoothStatus();`.

