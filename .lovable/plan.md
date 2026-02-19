
# Remover Seção "Catálogo digital ao vivo"

## O que será removido

A seção "Veja funcionando agora" (id="demo") com os 3 cards de exemplo (Burguer da Hora, Pizza Feliz, Farma Express) — linhas 347–381 do `src/pages/Index.tsx`.

## Impacto

Junto com a seção, também serão removidos:
- O array `examples` (declarado no topo do arquivo) — usado exclusivamente por essa seção
- O import do `Link` do `react-router-dom` caso não seja mais utilizado em outro lugar da página (verificar — o botão "Começar Grátis" e "Ver Cardápio Demo" também usam `Link`, então o import permanece)

## Arquivo a modificar

| Arquivo | Mudança |
|---|---|
| `src/pages/Index.tsx` | Remover bloco `{/* Demo section */}` (linhas 347–381) e o array `examples` do topo do arquivo |

Nenhuma outra seção é afetada. O CTA final que vem logo abaixo (linha 383) continua normalmente.
