

## Plano: Mover todos os itens Gourmet para a categoria "Gourmets"

### Situacao atual
Existem **20 itens** com nome "Gourmet" espalhados nas categorias erradas:
- 12 em "Lanches com 1 hambúrguer e sem batata frita"
- 8 em "Lanches com 2 hambúrgueres e batata frita"

### O que sera feito
Executar um UPDATE no banco de dados para mover todos os 20 itens cuja nome comeca com "Gourmet" para a categoria "Gourmets".

### Alteracao

**Banco de dados** — Um unico comando UPDATE:
```sql
UPDATE menu_items SET category = 'Gourmets' WHERE name ILIKE 'Gourmet%';
```

### Impacto
- Os 20 itens aparecerao agrupados sob a secao "Gourmets" no cardapio
- Nenhuma alteracao de codigo necessaria — a categoria "Gourmets" ja foi adicionada ao array `CATEGORIES`
- A ordenacao automatica posiciona Gourmets entre "Hambúrgueres triplo" e "Combos com batata frita"

