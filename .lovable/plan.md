

## Auditoria: Robustez da feature "Dias disponíveis"

### Cenários testados mentalmente

| # | Cenário | Resultado | Status |
|---|---------|-----------|--------|
| 1 | Item sem `available_days` (null) | Aparece sempre | ✅ OK |
| 2 | Item com `available_days: ["seg"]` num dia diferente | Oculto | ✅ OK |
| 3 | Item com `available_days: ["seg"]` na segunda | Visível | ✅ OK |
| 4 | Banco retorna `available_days` como string JSON em vez de array | `Array.isArray()` retorna false → item aparece sempre | ⚠️ Seguro (fail-open) |
| 5 | Banco retorna `available_days: []` (array vazio) | `[].includes(x)` = false → item nunca aparece | 🔴 Bug |
| 6 | Dashboard: desmarcar todos os dias | Código impede: `next.length === 0 ? [d.key] : next` → sempre pelo menos 1 dia | ✅ OK |
| 7 | Importação de cardápio ou INSERT direto com `[]` | Nenhuma proteção → item some para sempre | 🔴 Bug |
| 8 | Fuso horário: cliente no Japão, loja em SP | `getNowInBrasiliaDay()` calcula BRT fixo | ✅ OK |
| 9 | Editar item sem mudar dias | `'available_days' in input` check protege | ✅ OK |
| 10 | `available_days` com valor inesperado (ex: `"seg"` como string) | `Array.isArray()` = false → fail-open | ✅ Seguro |

### Bug encontrado

**Array vazio `[]`**: Se por qualquer motivo `available_days` for salvo como `[]` (via API, import, bug futuro), o item **desaparece para sempre** da loja. O filtro atual é:

```typescript
if (i.available_days && Array.isArray(i.available_days) && !i.available_days.includes(currentDayKey))
```

`[]` é truthy, é array, e `[].includes(x)` é sempre false → item nunca aparece.

### Correção

Adicionar check de `length > 0` no filtro do `UnitPage.tsx`:

```typescript
if (i.available_days && Array.isArray(i.available_days) && i.available_days.length > 0 && !i.available_days.includes(currentDayKey)) {
  return false;
}
```

Isso garante que `[]` é tratado como "todos os dias" (mesmo comportamento de `null`).

### Impacto
- Uma linha alterada em `src/pages/UnitPage.tsx`
- Zero risco de regressão — apenas adiciona mais uma condição de segurança

### Veredicto
A feature é sólida. O único edge case perigoso é o array vazio, e a correção é trivial. Todos os outros cenários (null, tipos inesperados, fusos horários, edição parcial) já estão protegidos.

### Arquivo alterado
- `src/pages/UnitPage.tsx` (1 linha)

