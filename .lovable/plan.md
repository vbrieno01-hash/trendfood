

# Adicionar barra de pesquisa na pagina publica

## Resumo
Adicionar um campo de busca (com icone de lupa) logo acima da barra de categorias na pagina publica da loja, permitindo que o cliente filtre os itens do cardapio em tempo real pelo nome ou descricao.

## Como vai funcionar
- Um campo de texto com icone de lupa aparece entre o banner e a barra de categorias
- O cliente digita e os itens sao filtrados instantaneamente (pelo nome e descricao)
- Quando ha texto na busca, a barra de categorias e os agrupamentos continuam visiveis, mas mostram apenas os itens que correspondem a pesquisa
- Categorias sem resultados ficam ocultas automaticamente
- Um botao "X" dentro do campo limpa a busca

## Mudancas tecnicas

### Arquivo: `src/pages/UnitPage.tsx`
1. Importar `Search` de `lucide-react`
2. Adicionar estado `searchQuery` (string)
3. Inserir o campo de busca (Input com icone de lupa) entre o banner e a barra de categorias
4. Filtrar `menuItems` pelo `searchQuery` antes de gerar o `groupedMenu` — comparando nome e descricao em lowercase
5. O campo tera placeholder "Buscar no cardapio..." e estilo compacto com bordas arredondadas
