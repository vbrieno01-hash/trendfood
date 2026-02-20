
# Melhorar placeholder de imagem dos produtos

## O que muda
Substituir o icone generico `ImageOff` (imagem quebrada) por um icone de comida (`UtensilsCrossed`) com fundo gradiente suave em tons quentes, criando um visual mais agradavel e profissional para produtos sem foto.

## Locais afetados

### 1. Vitrine publica (`src/pages/UnitPage.tsx`)
- **Grid de produtos (linha ~612)**: Trocar `ImageOff` por `UtensilsCrossed` com fundo gradiente radial em tons de laranja/ambar suave
- **Modal de detalhe do produto (linha ~1099-1101)**: Mesma melhoria com icone maior

### 2. Painel do lojista (`src/components/dashboard/MenuTab.tsx`)
- **Lista de itens do cardapio (linha ~200)**: Trocar `ImageOff` por `UtensilsCrossed` com mini gradiente suave

## Detalhes tecnicos

Cada placeholder tera:
- Fundo com gradiente radial suave (tons quentes: amber-50 para orange-100)
- Icone `UtensilsCrossed` centralizado com cor `text-orange-300` (sutil mas harmonioso)
- Sem dependencias novas - apenas Tailwind + Lucide (ja importado nos dois arquivos)

Tamanhos dos icones:
- Grid da vitrine: `w-8 h-8` (area quadrada aspect-square)
- Modal de detalhe: `w-12 h-12` (area maior aspect-video)
- Lista do dashboard: `w-5 h-5` (thumbnail 14x14)
