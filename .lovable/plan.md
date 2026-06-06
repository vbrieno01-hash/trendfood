## Objetivo

Manter toda a lógica atual (pedido, WhatsApp, status da loja, addons, cupom, fidelidade, tema dinâmico, cores do usuário) e apenas reformular o **visual** do storefront em `src/pages/UnitPage.tsx` para ficar parecido com o mockup "Rei do Burguer" — mais premium, com banner rotativo até 3 imagens.

## Escopo (somente UI)

### 1. Banner rotativo (até 3 fotos)
- Adicionar coluna `banner_urls text[]` em `public.organizations` via migration (mantém `banner_url` legado para retrocompatibilidade — o array vira a fonte principal; se vazio, faz fallback para `banner_url`).
- Em `StoreProfileTab.tsx`: substituir o upload único por uma grade de até 3 slots (upload/remover individual), salvando no array `banner_urls` (mesma lógica de upload do banner atual, mesmo bucket).
- Em `UnitPage.tsx`: novo componente local `BannerCarousel` (sem nova dependência — autoplay com `setInterval`, swipe touch nativo, dots de paginação no rodapé). Troca a cada 5s, pausa no hover/touch. Se houver só 1 imagem, comporta-se como hoje.
- Mantém o self-healing de banner quebrado (`cleanup-broken-banners`) por imagem.

### 2. Header repaginado (igual mockup, mas com cores do tema do usuário)
- Logo + nome em duas linhas: nome em destaque + slogan (usa `org.description` curta, ou tagline configurável já existente) com tipografia maior.
- Sininho de notificações some (não temos), mantém só logo + nome centralizado/esquerda como hoje.
- Sticky, com leve blur/glass por cima do banner.

### 3. Faixa de "selos" (Ingredientes selecionados · Preparo na hora · Entrega rápida · Compra segura)
- Linha horizontal scrollável de 4 pills com ícone circular contornado pela cor primária do tema + duas linhas de texto.
- Conteúdo fixo (sem CMS por enquanto, igual mockup).

### 4. CTA WhatsApp grande
- Card horizontal com ícone WhatsApp circular + "PEÇA AGORA PELO WHATSAPP!" + subtítulo "Mais rápido, prático e seguro!" + chevron.
- Reaproveita o número/`whatsappRedirect` que já existe no projeto.
- Só aparece se a loja tiver WhatsApp configurado.

### 5. Seções de categoria estilo "PROMOÇÃO DO DIA"
- Cabeçalho de cada categoria: emoji/ícone + nome em CAPS + linha horizontal degradê na cor primária + link "Ver todos" à direita.
- Cards de produto:
  - Imagem grande à direita (efeito "sangra" pra fora do card), preço destacado em vermelho/cor primária, badge "MAIS PEDIDO" reaproveitando flags já existentes (campeão de vendas / destaque).
  - Mantém quantidade, addons, fora de estoque, item pausado — toda lógica atual preservada.
- Layout dos cards adapta automaticamente: carrossel horizontal nas categorias com 3+ itens (mobile), grade normal no desktop. Sem mudar dados.

### 6. Rodapé "Obrigado pela preferência"
- Faixa horizontal com 3 blocos: agradecimento + horário de funcionamento (já tem `useStoreStatus`) + formas de pagamento (deriva de `payment_methods` da org).
- Bordas e ícones na cor primária do tema.

### 7. Refino visual geral
- Fundo `bg-background` mantido (segue dark/light do usuário).
- Cards com borda sutil na cor primária + `shadow-lg` + cantos arredondados maiores (`rounded-2xl`).
- Mantém footer global do storefront (`storefront-footer` com Ajuda/Cart) intacto.

## Fora do escopo
- Não muda nenhuma cor padrão, nenhum endpoint, nenhuma regra de pedido/checkout/pagamento.
- Não muda o painel admin, dashboard, KDS, etc.
- Não adiciona dependências novas (carrossel é caseiro).
- Mantém todas as feature flags, planos e gating como estão.

## Arquivos afetados
- `supabase/migrations/<novo>.sql` — adiciona `banner_urls text[] default '{}'` em `organizations`.
- `src/pages/UnitPage.tsx` — refatoração visual + `BannerCarousel` local.
- `src/components/dashboard/StoreProfileTab.tsx` — UI de até 3 banners.
- (opcional) ajuste mínimo em `src/integrations/supabase/types.ts` regenerado automaticamente após a migration.

## Pontos para confirmar
1. Posso adicionar a coluna `banner_urls` no banco (mantendo `banner_url` legado)?
2. Os 4 selos da faixa ("Ingredientes selecionados · Preparo na hora · Entrega rápida · Compra segura") podem ficar fixos por enquanto, ou quer que sejam editáveis pelo lojista já nessa primeira versão?
