
# Ajustar cor da seção CTA final

## Problema
A seção "Pare de pagar comissão. Comece hoje." usa um fundo vermelho escuro sólido que não combina com o novo tema visual de comércio/restaurante com tons quentes da Hero Section.

## Solução
Trocar o gradiente vermelho escuro por um gradiente escuro com tons quentes (cinza chumbo / marrom escuro), alinhado com a identidade visual de comércio de alimentação. Isso cria coerência com a Hero Section.

## Mudança

### Arquivo: `src/pages/Index.tsx` (linha ~337)
- Trocar o `style` do background da seção CTA de `linear-gradient(135deg, #7a0c0c 0%, hsl(0 84% 32%) 100%)` para um gradiente escuro com tons quentes, como `linear-gradient(135deg, #1a1410 0%, #2d1f15 50%, #1a1410 100%)`
- Manter os textos brancos e botões como estão
- Resultado: seção escura e elegante que combina com o tema de comércio/restaurante
