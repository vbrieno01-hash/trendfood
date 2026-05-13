## Problema

Na vitrine pública (`/unidade/slug` e `/mesa/...`), a loja não muda de "Fechada" para "Aberta" sozinha quando bate o horário de abertura. O cliente precisa atualizar a página.

### Causa raiz

`getStoreStatus(org.business_hours, org.force_open)` é executado a cada render usando `new Date()`. Mas o componente só re-renderiza quando:

1. O React Query refaz a query e retorna **uma referência nova** de `org` (a cada 30s);
2. ou o usuário interage.

Como `business_hours` quase nunca muda, em muitos casos o React Query devolve dados estruturalmente iguais e o componente não re-renderiza — então o `Date()` nunca é reavaliado e a loja "trava" no estado em que estava quando a página foi aberta.

A lógica em SQL (`get_store_status`) e em TS (`src/lib/storeStatus.ts`) está correta. As migrations de ontem (RLS de organizations/deliveries/couriers, PIX, cupons) não tocaram nesse fluxo.

## Solução

Adicionar um "tick" de tempo nas páginas da vitrine que força a recomputação do status a cada 30 segundos, independente de refetch.

### Arquivos a alterar

**1. `src/pages/UnitPage.tsx`**
- Adicionar um `useState` numérico (`tick`) e um `useEffect` com `setInterval(() => setTick(t => t+1), 30_000)`.
- Incluir `tick` na deps do `useMemo` que computa `storeStatus` (ou trocar a IIFE da linha 431 por `useMemo([org?.business_hours, org?.force_open, org?.paused, tick])`).
- Resultado: a cada 30s a página reavalia o relógio e abre a loja sozinha quando bater `from`.

**2. `src/pages/TableOrderPage.tsx`** (linha 91)
- Mesmo padrão: `tick` + `useMemo` para `storeStatus`.

**3. `src/pages/CourierPage.tsx`** (linha 266 — já tem dependência de `activeShift, businessHours, forceOpen`)
- Adicionar `tick` ao `useEffect` para que o painel do entregador também respeite a transição automática.

### O que NÃO mexer

- `src/lib/storeStatus.ts` — lógica correta, deixar como está.
- Função SQL `get_store_status` / `validate_store_open_for_order` — corretas, mantidas como segunda linha de defesa no INSERT do pedido.
- RLS de `organizations` — `business_hours` segue concedido a `anon` (migration `20260513015213`).
- `useOrganization` — mantém `refetchInterval: 30s` (cobre mudanças reais de `paused`/`force_open`).

### Validação

- Abrir a vitrine de uma loja com `from: 23:59` (ou ajustar temporariamente) e esperar passar o minuto sem dar refresh → deve virar "Aberta" em até 30s.
- Conferir nas duas páginas (`/unidade/slug` e `/mesa/N`).

### Por que `setInterval` em vez de `refetchInterval`

Refetch fala com o backend e depende de mudança de referência para re-renderizar. O `tick` local é gratuito (sem rede), garantido a cada 30s, e só serve para reavaliar `Date()`. Combinados, dão robustez total.
