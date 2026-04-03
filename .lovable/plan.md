

## Plano: Bloquear pedidos em loja pausada de forma blindada

### Problema
Quando a loja é pausada, o cliente pode ainda ter a página aberta com dados em cache (`staleTime: 2min`, `refetchInterval: 5min`). A UI mostra a loja como aberta e permite finalizar o pedido. Existem 3 camadas de proteção (UI, pre-check no hook, trigger no banco), mas a janela de cache permite que o cliente chegue até o envio.

### Correções

**1. Reduzir cache do org para 30s** (`src/hooks/useOrganization.ts`)
- `refetchInterval`: 5min → 60s
- `staleTime`: 2min → 30s
- Isso faz a UI atualizar muito mais rápido quando a loja é pausada

**2. Re-validar status ao abrir o checkout** (`src/pages/UnitPage.tsx`)
- Quando o drawer de checkout abre, fazer `queryClient.invalidateQueries(["organization", slug])` para forçar re-fetch imediato
- Se a loja estiver pausada no momento do re-fetch, fechar o drawer e mostrar toast

**3. Re-validar status ao clicar "Enviar Pedido"** (`src/pages/UnitPage.tsx`)
- No `handleSendWhatsApp`, antes de chamar `placeOrder.mutate`, fazer um fetch direto do campo `paused` e bloquear se `true`
- Mesmo padrão que já existe no `usePlaceOrder`, mas com feedback visual imediato

**4. Mesma proteção no TableOrderPage** (`src/pages/TableOrderPage.tsx`)
- Aplicar a mesma re-validação no `handleFinish` antes de enviar

### Arquivos modificados
| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useOrganization.ts` | Reduzir `staleTime` e `refetchInterval` |
| `src/pages/UnitPage.tsx` | Re-validar ao abrir checkout e ao enviar pedido |
| `src/pages/TableOrderPage.tsx` | Re-validar ao clicar "Finalizar" |

### Resultado
Mesmo que o cliente tenha a página aberta há horas, ao tentar enviar o pedido o sistema valida em tempo real. As 3 camadas ficam reforçadas: UI atualiza em 30s, checkout re-valida ao abrir, e o envio re-valida antes de inserir.
