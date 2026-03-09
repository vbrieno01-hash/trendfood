

## Plano: Importação em Massa de Produtos via CSV/Excel

### Resumo
Criar um componente de importação CSV/XLSX no MenuTab do dashboard, com upload de arquivo, mapeamento manual de colunas, validação de preços e bulk insert na tabela `menu_items` usando o `organization_id` da loja logada.

### Dependencias
- Instalar `papaparse` (CSV parsing) e `xlsx` (Excel parsing) como dependencias do projeto.

### Arquivos a Criar

#### 1. `src/components/dashboard/ImportMenuDialog.tsx`
Componente modal com 3 etapas:

**Etapa 1 - Upload**: Input de arquivo (.csv, .xlsx). Ao selecionar, parseia client-side com papaparse (CSV) ou xlsx (XLSX). Extrai headers e primeiras 3 linhas como preview.

**Etapa 2 - Mapeamento de Colunas**: Exibe uma tabela mostrando cada coluna do arquivo com um `<Select>` ao lado para mapear para: Nome do Produto (obrigatório), Preço (obrigatório), Descrição (opcional), Categoria (opcional). Mostra preview dos dados mapeados. Botão "Importar" só ativa quando os 2 campos obrigatórios estão mapeados.

**Etapa 3 - Processamento e Resultado**: 
- Limpa preços: remove "R$", espaços, troca "," por ".", `parseFloat`
- Valida que cada linha tem nome não-vazio e preço numérico > 0
- Linhas inválidas são ignoradas (mostrar contador)
- Categoria padrão: "Outros" se não mapeada
- Bulk insert via `supabase.from("menu_items").insert([...])` com `organization_id` injetado em todas as linhas
- `available: true`, `hide_global_addons: false` como defaults
- Toast de sucesso com contagem de itens importados
- Invalida query cache `["menu_items", orgId]` para atualizar lista
- Toast de erro se falhar

### Arquivos a Modificar

#### 2. `src/components/dashboard/MenuTab.tsx`
- Importar `ImportMenuDialog`
- Adicionar state `importOpen`
- Adicionar botão "Importar Cardápio (CSV/Excel)" com icone `Upload` ao lado do botão "Novo item" (linha ~842)
- Renderizar `<ImportMenuDialog open={importOpen} onOpenChange={setImportOpen} organization={organization} />`

### Seguranca
- O `organization_id` vem do state da org logada (já validado por auth)
- RLS policy `menu_items_insert_owner` garante que só o dono pode inserir
- Nenhuma alteracao de schema ou migracao necessaria
- Nenhum dado existente sera apagado

### Detalhes Tecnicos

```text
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Upload File │───>│  Map Columns │───>│  Bulk Insert │
│  .csv/.xlsx  │    │  Nome, Preço │    │  menu_items  │
│  papaparse   │    │  Desc, Categ │    │  + org_id    │
│  xlsx        │    │  Select UI   │    │  invalidate  │
└──────────────┘    └──────────────┘    └──────────────┘
```

Limpeza de preço:
```typescript
function parsePrice(raw: string): number | null {
  const cleaned = String(raw).replace(/[R$\s]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) || num <= 0 ? null : num;
}
```

