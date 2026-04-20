
## Pedido

Melhorar as blindagens de "loja fechada" pra **nunca mais** um cliente conseguir ver/fazer pedido fora do horário, mesmo em casos esquisitos (cache antigo, race condition, lojista esqueceu de configurar, etc).

## Diagnóstico do estado atual

Hoje tem 3 camadas, mas com furos:

| Camada | Status | Furo |
|---|---|---|
| 1. Frontend `getStoreStatus` | ✅ Corrigido | Refetch só a cada 60s — aba aberta há minutos pode mostrar aberta |
| 2. Hook `usePlaceOrder` (UI) | ✅ Existe | Reusa o mesmo cálculo do (1) — herda o mesmo lag |
| 3. Trigger SQL `validate_store_open_for_order` | ⚠️ Função criada, mas **trigger não está ativo** | `<db-triggers>` mostra "There are no triggers in the database" — **CRÍTICO** |

### Achado crítico

A consulta do schema mostra `<db-triggers>There are no triggers in the database</db-triggers>`. Ou seja, a **função existe mas nenhum trigger está disparando ela**. O backend hoje **não está bloqueando** pedidos fora do horário — só a UI bloqueia. Se um cliente burlar a UI (ou tiver cache antigo), o pedido entra.

Isso explica perfeitamente as reclamações: a UI mostra fechado em geral, mas em algum cenário (cache, força refresh, etc) o cliente consegue passar e o banco aceita.

## Plano de blindagem (5 reforços)

### 1. Reativar o trigger no banco (CRÍTICO — resolve 80% do risco)

Migration que cria o trigger `BEFORE INSERT` na tabela `orders` chamando `validate_store_open_for_order()`. Sem isso, todo o resto é cosmético.

```sql
DROP TRIGGER IF EXISTS tr_validate_store_open ON public.orders;
CREATE TRIGGER tr_validate_store_open
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_store_open_for_order();
```

### 2. RPC server-side de status (fonte única da verdade)

Criar função `public.get_store_status(_org_id uuid)` que retorna `{open, reason, opens_at}` calculando **no banco** com `AT TIME ZONE 'America/Sao_Paulo'`. O frontend passa a chamar essa RPC em vez de calcular local. Vantagens:
- Hora vem do servidor, não do celular do cliente
- Mesma lógica do trigger → impossível UI e backend divergirem
- Funciona offline-first com fallback pro cálculo local

### 3. Refetch mais agressivo + revalidação no foco da aba

Em `useOrganization.ts`:
- `refetchInterval: 60_000` → **30_000** (30s)
- Adicionar `refetchOnWindowFocus: true` + `refetchOnReconnect: true`
- Adicionar listener de `visibilitychange` no `UnitPage` pra invalidar o status quando a aba volta do background

Resolve o caso "cliente deixou aba aberta a noite toda".

### 4. Revalidação no clique do "Adicionar ao carrinho" e no "Finalizar pedido"

Antes de abrir o checkout E antes de chamar `placeOrder`, fazer `await queryClient.refetchQueries(['organization', slug])` e re-checar `getStoreStatus`. Se fechado → toast amigável + bloqueia. Garante checagem fresca no momento crítico.

### 5. Fallback "loja fechada" amigável quando o trigger bloqueia

Capturar o erro `'Loja fechada no momento'` no `usePlaceOrder` e mostrar toast claro + redirecionar pra home da unidade com banner "Voltamos às XX:XX". Hoje o erro genérico assusta.

### 6. (Bônus) Aviso na Home do dashboard

Card vermelho na `HomeTab` quando `business_hours.enabled = false` ou `force_open = true`, lembrando o lojista. Pega o cenário "lojista esqueceu de configurar".

## Arquivos

- **Nova migration** — criar trigger `tr_validate_store_open` + função RPC `get_store_status`
- `src/hooks/useOrganization.ts` — refetch 30s + onFocus/onReconnect
- `src/lib/storeStatus.ts` — adicionar variante async que chama a RPC com fallback local
- `src/pages/UnitPage.tsx` — listener de `visibilitychange` + revalidação no clique do CTA
- `src/hooks/useOrders.ts` (ou onde `placeOrder` mora) — refetch antes de submeter + tratamento do erro de trigger
- `src/components/dashboard/HomeTab.tsx` — card de aviso pra lojista sem horário/com force_open

## Resultado esperado

Mesmo que **tudo** dê errado no frontend (cache zumbi, JS quebrado, cliente em outro fuso, hacker forjando POST), o trigger no banco **rejeita o INSERT** e o pedido nunca entra. As outras 5 camadas só servem pra dar uma UX bonita antes do banco bloquear.
