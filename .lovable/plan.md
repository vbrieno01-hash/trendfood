

## Adicionar funcionalidades faltantes ao FeaturesTab

Inserir 3 itens no array `FEATURES` em `src/components/dashboard/FeaturesTab.tsx`:

1. **Adicionais** — ícone `Plus` ou `ListPlus`, minPlan `pro`, status `available`
   - "Adicione opções extras aos itens do cardápio (bordas, tamanhos, acompanhamentos)."

2. **Pagamento Online** — ícone `CreditCard` ou `Smartphone`, minPlan `pro`, status `available`
   - "Aceite pagamentos via PIX e cartão de crédito diretamente pelo cardápio digital."

3. **Gestão de Insumos** — ícone `Package` ou `Boxes`, minPlan `enterprise`, status `available`
   - "Controle estoque de ingredientes com baixa automática a cada venda."

Os novos itens serão inseridos na posição lógica: Adicionais e Pagamento Online junto aos outros Pro (após "Mais Vendidos"), e Gestão de Insumos junto aos Enterprise (após "Multi-unidade").

Apenas adição de itens ao array, sem mudança de lógica.

