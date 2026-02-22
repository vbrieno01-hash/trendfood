
# Melhorias: Impressao e WhatsApp

## 1. Corrigir marcadores na impressao desktop

O texto do cupom usa marcadores `##CENTER##` e `##BOLD##` que funcionam na impressora Bluetooth, mas aparecem como texto literal no modo desktop (trendfood.exe).

**Arquivo**: `src/lib/formatReceiptText.ts`
- Exportar nova funcao `stripFormatMarkers(text)` que remove `##CENTER##` e `##BOLD##` do texto

**Arquivo**: `src/lib/printOrder.ts` (linha 321)
- No modo `desktop`: aplicar `stripFormatMarkers()` no texto antes de enviar para `enqueuePrint`
- Bluetooth continua recebendo os marcadores normalmente

## 2. Mensagem WhatsApp com link do site

Quando o motoboy aceita a corrida, a mensagem enviada ao cliente incluira o link do site no final com um texto mais adequado (ja que o cliente ja fez o pedido).

**Arquivo**: `src/pages/CourierPage.tsx` (linha 216)

De:
```
Ola! Seu pedido da *Loja* saiu para entrega!
Aguarde em seu endereco que ja estamos a caminho.
Obrigado!
```

Para:
```
Ola! Seu pedido da *Loja* saiu para entrega!
Aguarde em seu endereco que ja estamos a caminho.
Obrigado!

Equipe *Loja* | trendfood.lovable.app
```

O link aparece de forma natural como assinatura da equipe, sem pedir para "fazer pedido" (ja que o cliente ja pediu).

---

## Resumo tecnico

| Arquivo | Linha | Alteracao |
|---------|-------|-----------|
| `src/lib/formatReceiptText.ts` | Final | Exportar `stripFormatMarkers()` |
| `src/lib/printOrder.ts` | 321 | Limpar marcadores no modo desktop |
| `src/pages/CourierPage.tsx` | 216 | Adicionar assinatura com link |
