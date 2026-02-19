
# Implementação das 5 Features — Estado atual e plano de execução

## O que foi verificado

- A tabela `coupons` **não existe** no banco ainda
- Os arquivos `HistoryTab.tsx`, `CouponsTab.tsx`, `BestSellersTab.tsx` **não existem**
- O hook `useCoupons.ts` **não existe**
- `useOrders.ts` **não tem** o hook `useOrderHistory`
- `WaiterTab.tsx` **não tem** botões de impressão (aceita só `orgId` e `whatsapp`, sem `pixKey` ou `orgName`)
- `KitchenTab.tsx` **não tem** notificações push
- `DashboardPage.tsx` **não tem** as 3 novas abas na sidebar

## Ordem de execução

### Passo 1 — Migration SQL (tabela `coupons`)

Cria a tabela com RLS completo:

```sql
CREATE TABLE public.coupons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code            text NOT NULL,
  type            text NOT NULL,
  value           numeric NOT NULL,
  min_order       numeric NOT NULL DEFAULT 0,
  max_uses        integer,
  uses            integer NOT NULL DEFAULT 0,
  active          boolean NOT NULL DEFAULT true,
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
-- SELECT público (clientes precisam validar cupom no checkout)
CREATE POLICY "coupons_select_public" ON public.coupons FOR SELECT USING (true);
-- INSERT/UPDATE/DELETE somente pelo dono da loja
CREATE POLICY "coupons_insert_owner" ON public.coupons FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM organizations WHERE id = organization_id));
CREATE POLICY "coupons_update_owner" ON public.coupons FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = organization_id));
CREATE POLICY "coupons_delete_owner" ON public.coupons FOR DELETE
  USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = organization_id));
-- Trigger para validar o type
CREATE OR REPLACE FUNCTION validate_coupon_type()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.type NOT IN ('percent', 'fixed') THEN
    RAISE EXCEPTION 'Invalid coupon type';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER check_coupon_type
  BEFORE INSERT OR UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION validate_coupon_type();
```

### Passo 2 — Hook `useCoupons.ts` (novo arquivo)

Contém:
- `useCoupons(orgId)` — lista os cupons da loja
- `useCreateCoupon(orgId)` — cria um novo cupom
- `useUpdateCoupon(orgId)` — atualiza/desativa cupom
- `useDeleteCoupon(orgId)` — deleta cupom
- `useValidateCoupon(orgId)` — valida cupom no checkout (sem autenticação necessária pois a policy SELECT é pública)

### Passo 3 — `CouponsTab.tsx` (novo arquivo)

UI completa:
- Lista de cupons com badge de status (Ativo/Inativo/Expirado), tipo (% ou R$), usos, validade
- Botão toggle para ativar/desativar
- Botão delete com confirmação
- Dialog de criação com campos: código, tipo, valor, pedido mínimo, limite de usos, data de validade

### Passo 4 — `useOrderHistory` em `useOrders.ts`

Novo hook que busca orders com `status = 'delivered'` com filtros de período e paginação (limite de 50 por vez para evitar o limite de 1000 rows do banco).

### Passo 5 — `HistoryTab.tsx` (novo arquivo)

UI:
- Filtros: Hoje / 7 dias / 30 dias / Tudo
- Campo de busca por número de mesa
- Toggle Pago / Não pago / Todos
- Cards com: mesa, data/hora, itens, total e badge de pagamento
- Resumo no topo: total de pedidos e receita do período

### Passo 6 — `BestSellersTab.tsx` (novo arquivo)

Lógica:
- Reutiliza `useDeliveredOrders` já existente
- Agrega `order_items` no frontend agrupando por `name`
- Calcula: quantidade vendida, receita, % do total
- Filtros de período identicos ao HistoryTab
- UI: tabela ranqueada com barra de progresso proporcional

### Passo 7 — Notificações push em `KitchenTab.tsx`

Adições:
- Estado `notificationsEnabled` salvo em `localStorage` com chave `kds_notifications`
- Botão toggle no header do KDS para habilitar/desabilitar
- `useEffect` que observa novos pedidos do realtime e dispara `new Notification("🔔 Novo pedido! Mesa X", { body: "...", icon: "/pwa-192.png" })`
- Solicita `Notification.requestPermission()` ao ativar o toggle pela primeira vez

### Passo 8 — Impressão em `WaiterTab.tsx`

- Adiciona props `orgName` e `pixKey` ao componente
- Importa `printOrder` de `src/lib/printOrder.ts`
- Adiciona botão "🖨️ Imprimir" nos cards de pedidos prontos para entrega e aguardando pagamento
- O botão chama `printOrder({ order, orgName, pixKey })`

### Passo 9 — Cupom no checkout (`TableOrderPage.tsx`)

- Campo de texto "Código do cupom" + botão "Aplicar"
- Ao aplicar: consulta tabela `coupons` filtrando por `organization_id`, `code` (case-insensitive), `active = true`
- Valida: expiração, pedido mínimo, limite de usos
- Se válido: mostra desconto em verde e recalcula total
- Ao confirmar o pedido: salva o código no campo `notes` com prefixo `CUPOM:CODIGO` e incrementa `uses` do cupom

### Passo 10 — `DashboardPage.tsx` (novas abas)

Adiciona 3 novas abas na navegação lateral (seção principal):

| Ícone | Label | Posição |
|---|---|---|
| `History` | Histórico | Após Mesas |
| `Tag` | Cupons | Após Histórico |
| `BarChart2` | Mais Vendidos | Após Cupons |

Atualiza o tipo `TabKey` para incluir `"history" | "coupons" | "bestsellers"`.

Passa `orgName={organization.name}` e `pixKey={(organization as any).pix_key}` para `WaiterTab`.

## Arquivos criados/modificados

| Arquivo | Ação |
|---|---|
| Migration SQL | `coupons` table + RLS + trigger |
| `src/hooks/useCoupons.ts` | Criado do zero |
| `src/components/dashboard/CouponsTab.tsx` | Criado do zero |
| `src/hooks/useOrders.ts` | Adiciona `useOrderHistory` |
| `src/components/dashboard/HistoryTab.tsx` | Criado do zero |
| `src/components/dashboard/BestSellersTab.tsx` | Criado do zero |
| `src/components/dashboard/KitchenTab.tsx` | Adiciona notificações push + toggle |
| `src/components/dashboard/WaiterTab.tsx` | Adiciona props `orgName`/`pixKey` + botões de impressão |
| `src/pages/TableOrderPage.tsx` | Adiciona campo de cupom no checkout |
| `src/pages/DashboardPage.tsx` | Adiciona 3 abas, passa novas props para WaiterTab |
