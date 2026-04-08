

## Plano: Corrigir pausa ignorada quando "Forçar Loja Aberta" está ativo

### Problema
A função `getStoreStatus` retorna `{ open: true }` imediatamente quando `force_open = true`, **antes** de verificar a pausa. Ou seja, se o dono ativa "Forçar Loja Aberta" e depois configura uma pausa, a pausa é completamente ignorada.

A loja TrendFood está com `force_open: true` no banco — por isso a pausa nunca funciona.

### Solução
Duas correções complementares:

**1. `src/lib/storeStatus.ts`** — Mover a verificação de `forceOpen` para DEPOIS da verificação de pausa. Se o dia tem pausa configurada e o horário atual está dentro dela, retornar fechado mesmo com `force_open`.

```
// Antes (bugado):
if (forceOpen) return { open: true };  // pula tudo

// Depois (correto):
// forceOpen pula verificação de horário, mas NÃO pula pausa
```

Lógica: `forceOpen` significa "ignore se o horário diz que está fechado" — mas uma pausa é intencional, o dono quer fechar.

**2. `src/components/dashboard/BusinessHoursSection.tsx`** — Adicionar aviso visual quando `force_open` está ativo, informando que ele mantém a loja aberta fora do horário mas **não** durante pausas.

**3. `src/pages/UnitPage.tsx`** — Garantir que `isPaused` (flag `paused` do org) também tem prioridade sobre `force_open` (já funciona, pois é verificado separadamente).

**4. Trigger SQL `validate_store_open_for_order`** — Já trata corretamente: `force_open` pula horário mas o break é verificado depois. Nenhuma alteração necessária no banco.

**5. Testes `storeStatus.test.ts`** — Adicionar caso: `force_open = true` + pausa ativa → deve retornar fechado com reason "break".

### Impacto
- 2-3 arquivos alterados
- Corrige o bug real que o usuário está enfrentando
- Pausa passa a funcionar independente de `force_open`

