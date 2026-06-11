## O que vai mudar

### 1. Remover CTA grande "PEÇA AGORA PELO WHATSAPP"
Em `src/pages/UnitPage.tsx`, retiro o card acima da busca. O botão flutuante no rodapé continua.

### 2. Formas de pagamento configuráveis pela loja
- Nova coluna `payment_methods jsonb` em `organizations` (Dinheiro, Maquininha, Débito, Crédito, PIX — todas ligadas por padrão). **Já criada via migration.**
- Em `StoreProfileTab.tsx`, na seção "Pagamentos": lista de checkboxes para o lojista marcar quais aceita.
- Em `UnitPage.tsx`:
  - O `<Select>` de pagamento no checkout só mostra os métodos habilitados.
  - O bloco "Formas de pagamento" do rodapé "Obrigado pela preferência" mostra exatamente o que a loja aceita (em vez de PIX/Cartão/Dinheiro fixos). Se nenhum, esconde o bloco.

### 3. Carrossel por categoria (opcional, independente por categoria)
- Nova coluna `category_layout jsonb` em `organizations` (mapa `{ "Lanches": "carousel" | "grid" }`). **Já criada via migration.**
- Em `MenuTab.tsx`, no cabeçalho de cada categoria (junto dos botões de pausar/mover): toggle "Carrossel deslizante" — salva no mapa.
- Em `UnitPage.tsx`: cada categoria renderiza independente. Se marcada como `carousel`, vira scroll horizontal com snap (`overflow-x-auto snap-x`, cards com largura fixa). Senão, mantém o grid atual. Categorias nunca se misturam.

### 4. Melhorias visuais (mantendo cores/tema do usuário)
- **Banner rotativo até 3 fotos**: já implementado (slots em `StoreProfileTab`, `BannerCarousel` em `UnitPage`). Permanece.
- Cards de produto com hover sutil (`hover:scale-[1.02]`), sombra mais suave e `rounded-2xl` consistente.
- Cabeçalhos de categoria com linha em degradê (já feito) + ícone destacado.
- Microanimação `animate-in fade-in` nos cards.
- Faixa de selos mantém estilo atual.

## Arquivos
- `src/hooks/useOrganization.ts` — adicionar `banner_urls`, `payment_methods`, `category_layout` no `select` e na interface.
- `src/pages/UnitPage.tsx` — remover CTA WhatsApp, filtrar pagamentos, carrossel por categoria, rodapé dinâmico, refino dos cards.
- `src/components/dashboard/StoreProfileTab.tsx` — checkboxes de formas de pagamento.
- `src/components/dashboard/MenuTab.tsx` — toggle de carrossel por categoria.

## Fora do escopo
- Sem mudança em checkout (lógica de pedido/PIX/WhatsApp), RLS, planos, KDS, admin.
- Sem novas dependências.
- Cores e tema do lojista preservados.