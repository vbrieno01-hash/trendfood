

# Trocar foto de fundo da Hero Section

## Objetivo
Substituir a foto atual do hamburguer por uma imagem relacionada a comercio/negocio de alimentacao - algo que mostre o ambiente de trabalho de um estabelecimento food service.

## Mudanca

### Arquivo: `src/pages/Index.tsx`
- Trocar a URL da imagem de fundo (linha 149) de hamburguer artesanal para uma foto que represente comercio de alimentacao
- Opcoes de imagem do Unsplash:
  - Balcao de lanchonete/restaurante movimentado
  - Cozinha comercial em operacao
  - Entregador com sacola de delivery
- Sugestao principal: foto de um balcao de food truck ou lanchonete com movimento, tons quentes e ambiente comercial
- URL sugerida: `https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1920&q=80` (restaurante/bar ambiente comercial com iluminacao quente)
- Manter o overlay escuro e todo o resto igual

### Detalhes tecnicos
- Apenas 1 linha alterada: o atributo `src` da tag `<img>` na Hero Section
- Ajustar o `alt` para refletir a nova imagem

