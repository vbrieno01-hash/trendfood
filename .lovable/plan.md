

## Plano: Melhorar UX do Carrinho — Botão Flutuante + Modificadores

### 1. Criar tabela `menu_item_addons` no banco

Nova tabela para armazenar adicionais configuráveis por item do cardápio:

```sql
CREATE TABLE public.menu_item_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_item_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read addons" ON public.menu_item_addons
  FOR SELECT USING (true);

CREATE POLICY "Org owners manage addons" ON public.menu_item_addons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      JOIN public.organizations o ON o.id = mi.organization_id
      WHERE mi.id = menu_item_addons.menu_item_id
      AND o.owner_id = auth.uid()
    )
  );
```

### 2. Atualizar o tipo `CartItem`

Expandir para incluir adicionais selecionados e observação por item:

```typescript
type CartItemAddon = { id: string; name: string; price: number };
type CartItem = {
  id: string;        // chave única = itemId + hash dos addons
  menuItemId: string;
  name: string;
  price: number;
  qty: number;
  addons: CartItemAddon[];
  notes: string;
};
```

Cada combinação única de item + adicionais gera uma entrada separada no carrinho (como iFood/Rappi).

### 3. Refatorar o Item Detail Drawer (modal de produto)

O drawer existente em `UnitPage.tsx` (linhas 1260-1341) será expandido para incluir:

- **Seção de Adicionais**: Lista de checkboxes com nome + preço (buscados da tabela `menu_item_addons`). Cada addon selecionado soma ao subtotal do item.
- **Campo de Observações**: `Textarea` com placeholder "Ex: Sem cebola, ponto da carne..." (por item, não global).
- **Preço dinâmico**: O botão "Adicionar" mostra o preço total (base + adicionais selecionados × quantidade).
- **Seletor de quantidade** inline no modal antes de adicionar.

### 4. Melhorar o Botão Flutuante (Floating Cart Bar)

O botão flutuante já existe (linhas 816-852), mas será melhorado:

- Adicionar ícone de sacola (`ShoppingBag`) em vez de apenas o badge numérico.
- Mostrar "X itens · R$ XX,XX" de forma mais visível.
- Animação suave de entrada (slide-up) quando o primeiro item é adicionado.
- Leve bounce/pulse ao adicionar novo item.

### 5. Atualizar mensagem do WhatsApp e dados do pedido

Os adicionais e observações por item serão incluídos:
- Na mensagem WhatsApp: `• 1x Hambúrguer (+ Bacon, + Queijo extra) — R$ 35,00 | Obs: Sem cebola`
- No campo `notes` do pedido salvo no banco.

### 6. Hook `useMenuItemAddons`

Novo hook para buscar adicionais disponíveis de um item:

```typescript
// src/hooks/useMenuItemAddons.ts
const useMenuItemAddons = (menuItemId: string | undefined) => {
  return useQuery({
    queryKey: ['menu-item-addons', menuItemId],
    queryFn: () => supabase.from('menu_item_addons')
      .select('*').eq('menu_item_id', menuItemId)
      .eq('available', true).order('sort_order'),
    enabled: !!menuItemId,
  });
};
```

### Detalhes técnicos

- A chave do carrinho muda de `item.id` para `item.id + JSON.stringify(addons)` para permitir o mesmo produto com adicionais diferentes como entradas separadas.
- O `addToCart` passa a receber `{ ...item, addons, notes }`.
- O `removeFromCart` usa a chave composta.
- Nenhuma alteração no `CheckoutPage.tsx` (usado em outro fluxo).

### Arquivos alterados
1. **Nova migration SQL** — tabela `menu_item_addons`
2. **Novo hook** — `src/hooks/useMenuItemAddons.ts`
3. **`src/pages/UnitPage.tsx`** — CartItem type, drawer refactor, floating bar melhorado, WhatsApp message format

