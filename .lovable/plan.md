

## Plano: Sistema de Avaliações com Estrelas após Pedido Entregue

### Visão geral

Quando o cliente faz um pedido pela vitrine (UnitPage), ao finalizar e receber confirmação, ele recebe um **link de avaliação**. Esse link leva a uma página pública onde o cliente pode dar de 1 a 5 estrelas e deixar um comentário. As avaliações ficam visíveis no painel do lojista e na vitrine da loja.

### Componentes

**1. Tabela `reviews` no banco de dados**

```sql
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  order_id uuid UNIQUE NOT NULL,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  customer_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode ler (vitrine pública)
CREATE POLICY reviews_select_public ON public.reviews FOR SELECT USING (true);
-- Qualquer um pode inserir (cliente anônimo)
CREATE POLICY reviews_insert_public ON public.reviews FOR INSERT WITH CHECK (true);
-- Dono e admin podem deletar
CREATE POLICY reviews_delete_owner ON public.reviews FOR DELETE
  USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = reviews.organization_id));
CREATE POLICY reviews_delete_admin ON public.reviews FOR DELETE
  USING (has_role(auth.uid(), 'admin'));
```

**2. Página pública de avaliação — `/avaliar/:orgSlug/:orderId`**

- Nova página `src/pages/ReviewPage.tsx`
- Exibe nome da loja, emoji, e os itens do pedido
- 5 estrelas clicáveis + textarea opcional para comentário
- Botão "Enviar Avaliação" → insere na tabela `reviews`
- Se já avaliou (order_id único), mostra mensagem "Você já avaliou este pedido"

**3. Link de avaliação após pedido confirmado**

- No `UnitPage.tsx`, após o pedido ser colocado com sucesso, exibir no toast/tela de confirmação um link: `Avalie seu pedido →` apontando para `/avaliar/{slug}/{orderId}`
- O link também pode ser incluído na mensagem de WhatsApp enviada ao cliente

**4. Exibição das avaliações na vitrine (UnitPage)**

- Novo componente `src/components/unit/StoreReviews.tsx`
- Mostra média de estrelas e quantidade de avaliações no topo da loja
- Lista as últimas 5-10 avaliações com estrelas, nome e comentário
- Seção colapsável "Ver avaliações"

**5. Painel do lojista — nova aba "Avaliações"**

- Novo componente `src/components/dashboard/ReviewsTab.tsx`
- Lista todas as avaliações com filtros (por estrela, período)
- Média geral e distribuição (quantas 5★, 4★, etc.)
- Opção de excluir avaliações impróprias

**6. Rota no App.tsx**

- Adicionar rota `/avaliar/:slug/:orderId` → `ReviewPage`

### Arquivos modificados/criados

| Arquivo | Ação |
|---------|------|
| Migração SQL | Criar tabela `reviews` com RLS |
| `src/pages/ReviewPage.tsx` | Criar página pública de avaliação |
| `src/components/unit/StoreReviews.tsx` | Criar seção de avaliações na vitrine |
| `src/components/dashboard/ReviewsTab.tsx` | Criar aba de avaliações no dashboard |
| `src/hooks/useReviews.ts` | Hook para CRUD de avaliações |
| `src/pages/UnitPage.tsx` | Adicionar link de avaliação pós-pedido + exibir média na vitrine |
| `src/pages/DashboardPage.tsx` | Adicionar aba "Avaliações" |
| `src/App.tsx` | Adicionar rota `/avaliar/:slug/:orderId` |

