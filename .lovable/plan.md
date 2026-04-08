

## Plano: Melhorar feedback visual de Bluetooth indisponível

### Problema atual
O `PrinterTab.tsx` já tem um alerta amarelo e toast quando Bluetooth não é suportado, mas:
1. **Não detecta iOS/Safari** — caso muito comum onde o cliente clica e nada acontece
2. **Não detecta WebView** (Instagram, Facebook) — outro caso frequente
3. A mensagem genérica "Use Chrome, Edge ou Opera" não é suficientemente específica para orientar o usuário

### Alterações

**1. `src/lib/bluetoothPrinter.ts`** — Expandir `getBluetoothStatus()` para retornar diagnósticos mais ricos:

Trocar o retorno de string simples por um objeto com `status` e `reason`:
- `"supported"` — tudo OK
- `"ios"` — detectado iOS/iPadOS (Safari não suporta Web Bluetooth)
- `"brave-disabled"` — Brave com flag desativada
- `"webview"` — dentro de WebView (Instagram, Facebook, etc.)
- `"firefox"` — Firefox não suporta
- `"unsupported"` — genérico

Detecção via user agent: iOS (`/iPad|iPhone|iPod/`), WebView (`/FBAN|FBAV|Instagram|Line|wv/`), Firefox (`/Firefox/`).

**2. `src/components/dashboard/PrinterTab.tsx`** — Mensagens contextuais no alerta e no toast:

Substituir o bloco do alerta (linhas 197-211) por mensagens específicas para cada `reason`:
- **iOS**: "O Safari e navegadores no iOS não suportam Bluetooth. Use um dispositivo Android com Google Chrome."
- **Brave**: "Ative em brave://flags/#enable-web-bluetooth e recarregue." (já existe)
- **WebView**: "Abra no navegador Chrome. O Bluetooth não funciona dentro de apps como Instagram ou Facebook."
- **Firefox**: "O Firefox não suporta Bluetooth. Use Google Chrome, Edge ou Opera."
- **Genérico**: "Use Google Chrome, Edge ou Opera para parear impressoras."

Mesma lógica aplicada ao toast no onClick do botão "Parear" (linhas 218-231).

### Impacto
- 2 arquivos, mudanças pontuais
- Zero impacto em funcionalidade existente — apenas melhora de UX informativa

