## Problema

Na página pública de vendas (`/unidade/[slug]`), o preço de cada produto fica quase invisível dentro do card.

Causa: o preço é renderizado com cor inline `accentTextColor`, cujo padrão é `#1e293b` (slate quase preto). O card usa `bg-card`, que no tema escuro também é escuro — então fica **texto escuro sobre fundo escuro**. Em telas com brilho mais alto fica ainda pior.

Mesmo arquivo afeta:
- Grade de produtos (`UnitPage.tsx`, linha ~1143)
- Drawer de detalhe do item (`ItemDetailDrawer.tsx` — `priceColor` hardcoded `#1e293b`, linhas 37, 113, 164)

## Plano

1. **Trocar a cor do preço por uma cor de destaque legível**:
   - Usar `org.primary_color` (laranja da marca) como cor padrão dos preços, em vez de `accentTextColor`. A cor primária da loja sempre tem contraste alto contra `bg-card` (claro **ou** escuro) e reforça hierarquia visual ("preço = destaque").
   - Manter `accentTextColor` apenas se a loja explicitamente o configurou via tema customizado (ou seja, deixar de usar o default `#1e293b` que está quebrando tudo).

2. **Garantir contraste mínimo**:
   - Aumentar levemente o tamanho/peso (`text-base font-extrabold` no grid) para o preço respirar.
   - No drawer, aplicar a mesma cor primária ao bloco de preço grande e ao "+ R$ x,xx" dos addons.

3. **Arquivos tocados**:
   - `src/pages/UnitPage.tsx` — preço do card (linha 1143) passa a usar `org.primary_color` (com fallback `hsl(var(--primary))`).
   - `src/components/unit/ItemDetailDrawer.tsx` — `priceColor` recebe `accentColor` (já vinda como prop) ou fallback `hsl(var(--primary))`, em vez do `#1e293b` chumbado.

4. **Sem mudança de schema, sem migration, sem mexer em business logic.** Apenas ajuste visual frontend.

## Resultado esperado

- Preço do card: laranja da marca, em destaque, **legível em qualquer tema**.
- Drawer de detalhe: mesmo tratamento, consistente.
- Lojas que personalizaram `accent_text_color` continuam respeitadas.
