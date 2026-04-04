
## Plano: Botão de exportar cardápio como CSV

### O que será feito
Adicionar um botão "Exportar CSV" ao lado do botão "Importar CSV/Excel" na aba de Cardápio, permitindo que o lojista baixe todo o cardápio em formato CSV.

### Arquivo alterado

**`src/components/dashboard/MenuTab.tsx`**

1. Importar o ícone `Download` do lucide-react
2. Criar uma função `handleExportCSV` que:
   - Monta um array com colunas: Nome, Descrição, Preço, Categoria, Disponível
   - Converte para string CSV com separador `;` (padrão BR, compatível com Excel)
   - Gera o download automático como `cardapio-{slug}.csv`
3. Adicionar o botão entre o "Importar CSV/Excel" e o "Limpar", na linha ~855

### Visual
Um botão outline com ícone de download, texto "Exportar CSV" (visível em desktop, só ícone no mobile), consistente com os outros botões da toolbar.
