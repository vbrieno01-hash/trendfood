

# Substituir Screenshot Mobile na Landing Page

## O que muda

A imagem do celular exibida no mockup da seção Showcase será substituída pela nova captura de tela enviada (dashboard mobile do "Burguer do Rei" com faturamento).

## Passos

1. Copiar a imagem `user-uploads://fasfasdasfasdasf.jpeg` para `public/mobile-screenshot.png` (substituindo a atual)
2. Nenhuma mudança de código necessaria -- o `ShowcaseSection.tsx` ja referencia `/mobile-screenshot.png`

## Arquivo impactado

| Arquivo | Mudanca |
|---|---|
| `public/mobile-screenshot.png` | Substituido pela nova imagem |

Zero mudancas de codigo. A imagem sera carregada automaticamente no mockup do celular.

