

# Barra de pesquisa fixa (sticky) na página pública

## Resumo
Tornar a barra de pesquisa "grudenta" (sticky) no topo da página, para que ela acompanhe o cliente conforme ele rola o cardápio.

## Como vai funcionar
- Quando o cliente rolar a página para baixo, a barra de pesquisa ficará fixa no topo da tela
- Ela terá um fundo sólido com sombra sutil para se destacar do conteúdo por trás
- O campo continua funcionando igual: filtra itens em tempo real e tem o botão X para limpar

## Mudanças técnicas

### Arquivo: `src/pages/UnitPage.tsx`
1. Mover a barra de pesquisa para fora do `<main>` e colocá-la logo após o `<header>`, envolvida em um container sticky
2. Aplicar `sticky top-[57px] z-30` (abaixo do header fixo) com fundo sólido (`bg-background`) e padding horizontal
3. Adicionar uma sombra sutil (`shadow-sm`) quando fixada para separação visual
4. Manter o `max-w-2xl mx-auto` para alinhar com o conteúdo principal

