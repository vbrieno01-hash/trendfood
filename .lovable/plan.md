

## Plano: Duas caixinhas retangulares — Ajuda (WhatsApp) e Sacola

### Ideia
Substituir o FAB circular do WhatsApp e a barra arredondada do carrinho por **duas caixinhas retangulares lado a lado** fixas no rodapé, com design uniforme.

### Layout visual

```text
┌──────────────────────────────────────────┐
│              Página da loja              │
│                                          │
│                                          │
├───────────────────┬──────────────────────┤
│  💬 Ajuda         │  🛍 Sacola (3) R$45  │
│  (WhatsApp)       │  Ver sacola →        │
└───────────────────┴──────────────────────┘
  fixed bottom-4, gap-2, ambas rounded-xl
```

- **Caixa esquerda (Ajuda)**: `<a>` com ícone WhatsApp + texto "Ajuda", cor verde `#25D366`, abre `wa.me`. Visível só se `org.whatsapp` existir.
- **Caixa direita (Sacola)**: `<button>` com ícone sacola + quantidade + preço. Cor primária da loja. Visível só se `totalItems > 0`.
- Quando só uma das duas existe, ela ocupa a largura toda (`flex-1`).
- Quando o checkout ou item drawer estiver aberto, ambas somem.
- Loja fechada com itens no carrinho: caixa da sacola fica desabilitada com "🔒 Loja fechada".

### Mudança

**Arquivo: `src/pages/UnitPage.tsx`**

1. Remover o FAB circular do WhatsApp (linhas 1335-1349)
2. Substituir a seção "FLOATING CART BAR" (linhas 904-948) por um container flex com as duas caixinhas:
   - Container: `fixed bottom-4 left-0 right-0 z-50 flex gap-2 px-4 max-w-sm mx-auto`
   - Caixa Ajuda: `<a>` retangular, `rounded-xl`, fundo verde, ícone + "Ajuda"
   - Caixa Sacola: mesma lógica atual mas com formato retangular consistente
3. Visibilidade: o container aparece se `org.whatsapp` existir OU `totalItems > 0` (e checkout/drawer fechados)

### Arquivo modificado
| Arquivo | Mudança |
|---------|---------|
| `src/pages/UnitPage.tsx` | Unificar WhatsApp FAB e cart bar em duas caixinhas retangulares lado a lado |

