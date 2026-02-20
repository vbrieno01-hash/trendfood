

# Melhorar o visual do Cardápio (MenuTab)

O cardápio atual esta com um layout muito compacto -- thumbnails pequenas (40px), pouco espaçamento e informacoes apertadas. Vamos dar uma "aumentada" geral para ficar mais profissional e agradavel.

## Mudancas planejadas no `src/components/dashboard/MenuTab.tsx`:

1. **Thumbnails maiores**: De 40x40px para 56x56px (w-14 h-14) com bordas arredondadas maiores
2. **Mais padding nas linhas**: De `px-3 py-2.5` para `px-4 py-3.5` em cada item
3. **Tipografia maior**: Nome do item de `text-sm` para `text-base`, descricao de `text-xs` para `text-sm`
4. **Preco mais destacado**: Fonte maior e com cor de destaque
5. **Header de categoria mais visivel**: Texto um pouco maior com mais espaco entre categorias (`mb-3` e `mt-6`)
6. **Botoes de acao maiores**: De `w-7 h-7` para `w-8 h-8` com icones ligeiramente maiores
7. **Largura maxima**: De `max-w-2xl` para `max-w-3xl` para aproveitar melhor o espaco

Nenhuma mudanca de logica ou banco de dados -- apenas ajustes visuais de tamanho e espacamento.

