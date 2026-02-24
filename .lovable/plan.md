

## Plano: Corrigir classificacao dos itens com "E" no nome

### Problema
17 itens com sufixo " E" no nome (X-Burguer E, X-Bacon E, X-Salada E, etc.) foram classificados como **"Lanches com 2 hambúrgueres e batata frita"**, mas a descrição de todos indica **"1 hambúrguer"**. O "E" não significa duplo -- são lanches simples.

### Itens afetados (17 no total)
X-3 Queijos E, X-Bacon E, X-Bacon Egg E, X-Burguer E, X-Calabacon Catupiry E, X-Calabacon Cheddar E, X-Calabacon E, X-Calabresa E, X-Calafrango Catupiry E, X-Calafrango Cheddar E, X-Calafrango E, X-cheddar E, X-Egg E, X-Frango Bacon Catupiry E, X-Frango Bacon E, X-Frango E, X-Salada E

### Correcao
Uma unica query UPDATE no banco:

```sql
UPDATE menu_items 
SET category = 'Lanches com 1 hambúrguer e sem batata frita' 
WHERE category = 'Lanches com 2 hambúrgueres e batata frita' 
  AND (name LIKE '% E' OR name LIKE '% E %')
```

### Resultado esperado
- **"Lanches com 1 hamburguer e sem batata frita"**: passara de 41 para 58 itens
- **"Lanches com 2 hamburgueres e batata frita"**: passara de 35 para 18 itens (somente os "Duplo" reais)
- Nenhuma mudanca de codigo necessaria

