

## Plano: Reclassificar itens existentes no banco

Analisando os 138 itens existentes com categorias antigas:

### Mapeamento proposto

**91 itens "Hambúrgueres" → 3 categorias:**
- Itens com "Triplo" no nome (ex: X-Bacon Triplo, X-Tudo triplo) → **"Hambúrgueres triplo"**
- Itens com "Duplo" ou "duplo" no nome (ex: Gourmet Bacon Duplo, Smash bacon duplo) → **"Lanches com 2 hambúrgueres e batata frita"**
- Itens com sufixo " E" no nome (ex: X-Bacon E, X-Salada E) → **"Lanches com 2 hambúrgueres e batata frita"** (o "E" indica versão especial/dupla)
- Todos os outros (ex: X-Burguer, X-Salada, Gourmet Bacon) → **"Lanches com 1 hambúrguer e sem batata frita"**

**47 itens "Combos" → 2 categorias:**
- Itens com "Batata" no nome (ex: Combo 1 Smash Burguer + Batata + 1 Refrigerante) → **"Combos com batata frita"**
- Itens sem "Batata" no nome (ex: Combo 1 X-Salada + 1 Refrigerante Lata) → **"Combos sem batata frita"**

### Execução

4 queries UPDATE no banco de dados usando a ferramenta de inserção/atualização:

1. `UPDATE menu_items SET category = 'Hambúrgueres triplo' WHERE category = 'Hambúrgueres' AND (name ILIKE '%triplo%')`
2. `UPDATE menu_items SET category = 'Lanches com 2 hambúrgueres e batata frita' WHERE category = 'Hambúrgueres' AND (name ILIKE '%duplo%' OR name LIKE '% E' OR name LIKE '% E %')`
3. `UPDATE menu_items SET category = 'Lanches com 1 hambúrguer e sem batata frita' WHERE category = 'Hambúrgueres'` (pega o restante)
4. `UPDATE menu_items SET category = 'Combos com batata frita' WHERE category = 'Combos' AND name ILIKE '%batata%'`
5. `UPDATE menu_items SET category = 'Combos sem batata frita' WHERE category = 'Combos'` (pega o restante)

A ordem importa: os updates mais específicos (triplo, duplo) rodam antes do genérico.

### Impacto
- Zero downtime, as categorias são texto livre
- Os itens aparecerão imediatamente nas novas seções no dashboard, loja pública e pedido de mesa
- Nenhuma mudança de código necessária (as categorias já foram atualizadas no passo anterior)

