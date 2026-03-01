

## Plano: Migrar adicionais existentes para globais automaticamente

### Situação atual
- **Rei do Burguer** (`7d99c44e`) tem 17 adicionais item-específicos (Bacon, Catupiry, Ovo, etc.) — cada um ligado a 1 produto só. Nenhum global addon criado.
- **TrendFood** (`c9d9db45`) tem 1 addon item-específico e já tem 3 globais.
- As outras orgs não têm adicionais.

### O que fazer
Rodar um script SQL (via migration) que, para cada organização:
1. Seleciona todos os `menu_item_addons` distintos por `(name, price_cents)` daquela org
2. Insere cada combinação única na tabela `global_addons` (se ainda não existir com mesmo nome + org)
3. Isso faz com que todos esses adicionais apareçam automaticamente em todos os produtos do cardápio

### SQL da migração
```sql
INSERT INTO global_addons (organization_id, name, price_cents, available, sort_order)
SELECT DISTINCT
  mi.organization_id,
  mia.name,
  mia.price_cents,
  true,
  0
FROM menu_item_addons mia
JOIN menu_items mi ON mi.id = mia.menu_item_id
WHERE NOT EXISTS (
  SELECT 1 FROM global_addons ga
  WHERE ga.organization_id = mi.organization_id
    AND LOWER(TRIM(ga.name)) = LOWER(TRIM(mia.name))
);
```

### Resultado
- **Rei do Burguer**: os 17 adicionais (Bacon R$5, Catupiry R$4, Ovo R$2, etc.) passam a aparecer em **todos** os lanches automaticamente
- **TrendFood**: só os que ainda não existem como global serão adicionados (evita duplicatas)
- Os adicionais item-específicos originais continuam existindo mas serão filtrados pelo merge no `ItemDetailDrawer` (que já remove duplicatas por nome)

### Arquivo alterado
- Apenas uma migração SQL (sem alteração de código — a lógica de merge já existe no `ItemDetailDrawer.tsx`)

