

## Plano: Mensagem específica de "Em intervalo" na página pública

### Problema
Quando a loja está em intervalo de descanso, o `storeStatus` retorna `{ open: false, opensAt: "13:30" }` — idêntico a "fechada". A página pública mostra "Loja fechada" sem distinguir que é apenas uma pausa temporária.

### Solução

**1. `src/lib/storeStatus.ts`** — Adicionar campo `reason` ao tipo de status fechado:

```typescript
export type StoreStatus =
  | null
  | { open: true }
  | { open: false; opensAt: string | null; reason?: "break" };
```

Nos 3 pontos onde retorna `{ open: false, opensAt: break_to }` (linhas 63, 91), adicionar `reason: "break"`.

**2. `src/pages/UnitPage.tsx`** — Usar o `reason` para exibir mensagens diferenciadas:

- **Badge** (linha 841-845): `"Em intervalo · volta às 13:30"` em vez de `"Fechado · abre às 13:30"`
- **Banner amarelo** (linha 856-864): `"☕ Em intervalo de descanso"` + `"Voltamos às 13:30"` com fundo amarelo em vez de vermelho
- **Rodapé do carrinho** (linha 1484): `"☕ Em intervalo · pedidos retornam às 13:30"`
- **Toast** (linhas 419, 1062): `"Loja em intervalo. Retorna às HH:MM"` em vez de `"Esta loja está fechada"`
- **Barra fixa inferior** (linha 1043): `"☕ Intervalo"` em vez de `"🔒 Fechada"`

**3. `src/pages/TableOrderPage.tsx`** — Mesma lógica (linha 691-699): mensagem de intervalo diferenciada.

### Impacto
- 3 arquivos alterados
- Compatível com lojas sem intervalo (campo `reason` é opcional)
- Visual: tom amarelo/âmbar para intervalo vs vermelho para fechada

