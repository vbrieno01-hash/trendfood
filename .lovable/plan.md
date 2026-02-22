
# Trocar rodape do cupom para nome da loja

## O que muda

O rodape "* novo pedido - kds *" sera substituido pelo nome da loja (ex: "NOME DA LOJA") em todos os modos de impressao. Caracteres especiais como `★` e `—` serao removidos.

## Alteracoes

### 1. `src/lib/formatReceiptText.ts` (linha 161)
Rodape do modo desktop/Bluetooth.

De:
```
center("* novo pedido - kds *", cols)
```
Para:
```
center(storeName.toUpperCase(), cols)
```
O `storeName` ja e recebido como parametro da funcao.

### 2. `src/lib/printOrder.ts` (linha 289)
Rodape do modo navegador (HTML).

De:
```html
<div class="footer">★ novo pedido — kds ★</div>
```
Para:
```html
<div class="footer">${storeName.toUpperCase()}</div>
```
O `storeName` ja esta disponivel nessa funcao.

---

## Resumo

| Arquivo | Linha | De | Para |
|---------|-------|----|------|
| `formatReceiptText.ts` | 161 | `* novo pedido - kds *` | Nome da loja |
| `printOrder.ts` | 289 | `★ novo pedido — kds ★` | Nome da loja |

2 linhas alteradas, sem caracteres especiais.
