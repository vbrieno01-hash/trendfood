
# Corrigir login do motoboy - normalizar telefone

## Problema
O login busca o telefone com comparacao exata (`eq`), mas o telefone salvo no banco tem mascara: `(83) 99824-4382`. Se o motoboy digitar `83998244382` ou `(83)99824-4382`, nao encontra.

## Solucao
Normalizar o telefone (remover tudo que nao e numero) antes de comparar. Como o telefone salvo no banco ja tem mascara, vamos usar duas estrategias:

1. Tentar busca exata primeiro (caso o motoboy digite exatamente como cadastrou)
2. Se nao encontrar, buscar todos os motoboys da org e comparar os telefones normalizados (somente digitos)

## Alteracoes

| Arquivo | O que muda |
|---------|-----------|
| `src/hooks/useCourier.ts` | Alterar `useLoginCourier` para normalizar telefone antes de comparar. Buscar motoboys da org e comparar somente digitos. |

## Detalhes tecnicos

### Funcao auxiliar de normalizacao
```typescript
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}
```

### Hook `useLoginCourier` atualizado
Em vez de `eq("phone", input.phone)`, buscar todos os couriers ativos da org e filtrar pelo telefone normalizado:

```typescript
const normalized = normalizePhone(input.phone);
const { data, error } = await supabase
  .from("couriers")
  .select("*")
  .eq("organization_id", input.organization_id)
  .eq("active", true);

if (error) throw error;
const match = (data ?? []).find(
  (c) => normalizePhone(c.phone) === normalized
);
if (!match) throw new Error("NOT_FOUND");
```

Isso garante que independente de como o motoboy digitar o telefone (com ou sem mascara), o login funciona.
