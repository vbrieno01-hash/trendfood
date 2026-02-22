
# Corrigir marcadores ## e caracteres especiais na impressao

## Problema
Os marcadores `##CENTER##` e `##BOLD##` estao aparecendo como texto literal nos cupons impressos. Alem disso, caracteres especiais como `★` e `📱` saem "bugados" em impressoras termicas que so suportam ASCII basico.

## Locais com problema

### 1. `useOrders.ts` (linha 210) - Fila automatica de pedidos
O texto formatado e enfileirado SEM remover os marcadores:
```
const text = formatReceiptText(printableOrder);
await enqueuePrint(organizationId, order.id, text);  // COM ##CENTER##
```
**Correcao**: Aplicar `stripFormatMarkers(text)` antes de enfileirar.

### 2. `printOrder.ts` (linha 342) - Fallback do Bluetooth
Quando o Bluetooth falha, o texto e salvo na fila COM marcadores:
```
await enqueuePrint(orgId, order.id, text);  // COM ##CENTER##
```
**Correcao**: Aplicar `stripFormatMarkers(text)`.

### 3. `SettingsTab.tsx` (linhas 158-167) - Teste de impressao
O teste de impressao envia `##CENTER##` literalmente:
```
"##CENTER## TESTE DE IMPRESSAO"
```
**Correcao**: Remover os marcadores do texto de teste (texto simples sem marcadores).

### 4. Caracteres especiais no `formatReceiptText.ts`
O rodape usa `*` que e seguro, mas o `center()` e `##BOLD##` ja estao tratados. Verificar que nenhum emoji ou caractere especial (★, 📱) esta no texto da fila.
- `formatReceiptText.ts` linha 161: usa `* novo pedido - kds *` (seguro, sem caracteres especiais)
- `printOrder.ts` linha 289: `★ novo pedido — kds ★` (so modo browser/HTML, nao afeta fila)

## Resumo das alteracoes

| Arquivo | Linha | Alteracao |
|---------|-------|-----------|
| `src/hooks/useOrders.ts` | 209-210 | Importar e aplicar `stripFormatMarkers` antes de `enqueuePrint` |
| `src/lib/printOrder.ts` | 342 | Aplicar `stripFormatMarkers(text)` no fallback Bluetooth |
| `src/components/dashboard/SettingsTab.tsx` | 157-167 | Remover `##CENTER##` do texto de teste |

3 arquivos, alteracoes pequenas e pontuais.
