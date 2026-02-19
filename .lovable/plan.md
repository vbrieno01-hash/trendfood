
# 5 Novas Funcionalidades para as Lojas

Implementação completa das cinco features solicitadas. Cada uma é independente e pode ser entregue sem modificar a estrutura do banco de dados existente (exceto a tabela `coupons`).

---

## 1. Histórico de Pedidos

**Nova aba no dashboard:** "Histórico"

- Consulta a tabela `orders` filtrada por `status = delivered`, sem limite de data
- Filtros: período (hoje / últimos 7 dias / últimos 30 dias / personalizado com date picker), busca por número de mesa e status de pagamento (pago / não pago / todos)
- Cada card mostra: mesa, data/hora, itens, total e badge de pagamento
- Sem necessidade de nova tabela — usa dados já existentes
- Novo arquivo: `src/components/dashboard/HistoryTab.tsx`
- Novo hook: `useOrderHistory` em `src/hooks/useOrders.ts`

---

## 2. Cupons de Desconto

**Nova tabela no banco + nova aba no dashboard + integração no checkout**

### Banco de dados (migration)
```sql
CREATE TABLE public.coupons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  code            text NOT NULL,
  type            text NOT NULL CHECK (type IN ('percent', 'fixed')),
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
-- SELECT público (clientes precisam validar o cupom)
CREATE POLICY "coupons_select_public" ON public.coupons FOR SELECT USING (true);
-- CRUD apenas pelo dono da loja
CREATE POLICY "coupons_insert_owner" ON public.coupons FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM organizations WHERE id = organization_id));
CREATE POLICY "coupons_update_owner" ON public.coupons FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = organization_id));
CREATE POLICY "coupons_delete_owner" ON public.coupons FOR DELETE
  USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = organization_id));
```

### Dashboard — nova aba "Cupons"
- Listagem dos cupons da loja (código, tipo, valor, usos, validade, status)
- Formulário para criar cupom: código, tipo (% ou R$), valor, pedido mínimo, limite de usos e data de validade
- Toggle para ativar/desativar cupom
- Arquivo: `src/components/dashboard/CouponsTab.tsx`
- Hook: `src/hooks/useCoupons.ts`

### Checkout (`TableOrderPage.tsx`)
- Campo "Cupom de desconto" no rodapé do formulário de pedido
- Botão "Aplicar" que valida o cupom via query no banco
- Se válido: mostra desconto aplicado em verde e recalcula o total
- O código do cupom é salvo no campo `notes` do pedido em formato `CUPOM:CODIGO` para rastreamento
- A coluna `uses` é incrementada no INSERT do pedido

---

## 3. Relatório de Itens Mais Vendidos

**Nova aba "Mais Vendidos" no dashboard**

- Agrega dados de `order_items` via JOIN com `orders` filtrados por `status = delivered` e `organization_id`
- Ranking exibindo: posição, nome do item, quantidade total vendida, receita gerada, percentual do total de receita
- Filtros de período: hoje / 7 dias / 30 dias / todo o período
- Barra de progresso visual mostrando a proporção de cada item
- Sem nova tabela — processado no frontend com os dados já carregados
- Arquivo: `src/components/dashboard/BestSellersTab.tsx`

---

## 4. Notificações Push de Pedidos (PWA)

**Web Push Notifications para o lojista**

- Solicita permissão de notificação ao abrir o KDS (`Notification.requestPermission()`)
- Quando um novo pedido chega via Realtime (já implementado no `KitchenTab`), dispara `new Notification(...)` com:
  - Título: "🔔 Novo pedido! Mesa X"
  - Body: lista dos itens
  - Ícone da PWA (`/pwa-192.png`)
- Funciona mesmo com o app minimizado (mas ainda na aba aberta), comportamento padrão da Web Notifications API
- Toggle na interface do KDS para habilitar/desabilitar notificações (salvo no `localStorage`)
- **Sem service worker extra** — usa a `Notifications API` nativa do browser, que funciona em PWA instalada
- Modificação no: `src/components/dashboard/KitchenTab.tsx`

---

## 5. Comanda em PDF / Impressão Melhorada no Painel do Garçom

**Botão "Imprimir Comanda" no WaiterTab**

- Reutiliza o `printOrder` já existente em `src/lib/printOrder.ts`
- Adiciona botão de impressão nos cards de "Aguardando Pagamento" do `WaiterTab`
- O print já inclui: cabeçalho da loja, mesa, itens com preços, total, e QR Code PIX (se configurado)
- Também adiciona botão de impressão nos cards de "Prontos para Entrega"
- A função já recebe `pixKey` — precisa apenas passar `orgName` e `pixKey` para o `WaiterTab`
- Modificação em: `src/components/dashboard/WaiterTab.tsx` e `src/pages/DashboardPage.tsx` (passar `pixKey` para WaiterTab)

---

## Navegação — Novas abas no Sidebar

Adicionar 3 novos itens à sidebar em `DashboardPage.tsx`:

| Ícone | Label | Key |
|---|---|---|
| `History` (lucide) | Histórico | `history` |
| `Tag` (lucide) | Cupons | `coupons` |
| `BarChart2` (lucide) | Mais Vendidos | `bestsellers` |

As novas abas ficam na seção principal do sidebar (junto com Home, Cardápio, Mesas).

---

## Resumo dos arquivos

| Arquivo | Ação |
|---|---|
| `supabase/migrations/...sql` | Nova tabela `coupons` com RLS |
| `src/components/dashboard/HistoryTab.tsx` | Criado do zero |
| `src/components/dashboard/CouponsTab.tsx` | Criado do zero |
| `src/components/dashboard/BestSellersTab.tsx` | Criado do zero |
| `src/hooks/useCoupons.ts` | Criado do zero |
| `src/hooks/useOrders.ts` | Adiciona `useOrderHistory` |
| `src/components/dashboard/KitchenTab.tsx` | Adiciona Web Push Notifications |
| `src/components/dashboard/WaiterTab.tsx` | Adiciona botões de impressão, recebe `pixKey` |
| `src/pages/DashboardPage.tsx` | Adiciona 3 abas no sidebar, passa `pixKey` para WaiterTab |
| `src/pages/TableOrderPage.tsx` | Adiciona campo e validação de cupom no checkout |

---

## Ordem de implementação

1. Migration SQL da tabela `coupons`
2. Hook `useCoupons.ts` + componente `CouponsTab.tsx`
3. Hook `useOrderHistory` + componente `HistoryTab.tsx`
4. Componente `BestSellersTab.tsx`
5. Web Push no `KitchenTab.tsx`
6. Impressão no `WaiterTab.tsx`
7. Checkout com cupom em `TableOrderPage.tsx`
8. Atualização do `DashboardPage.tsx` com todas as novas abas
