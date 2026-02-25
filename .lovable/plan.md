

# Plano: Reduzir espaço excessivo no footer da página de pedidos

## Diagnóstico
O footer em `src/pages/UnitPage.tsx` (linha 769) tem a classe `pb-36` — isso gera um padding-bottom de 9rem (144px), que é o espaço vazio que você está vendo abaixo das informações. Esse padding provavelmente foi colocado para dar espaço ao carrinho flutuante, mas ficou grande demais.

## O que será feito

### Atualizar `src/pages/UnitPage.tsx`
- Linha 769: trocar `pb-36` por `pb-20` no `<footer>`, reduzindo o espaço inferior de 144px para 80px — suficiente para o carrinho flutuante não cobrir o conteúdo.

## Seção técnica
```text
Arquivo: src/pages/UnitPage.tsx
Linha: 769
Mudança: pb-36 → pb-20
```

