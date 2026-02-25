
# Plano: corrigir itens/categorias novas que não aparecem para clientes no cardápio público

## Diagnóstico (confirmado)

O problema não está no cadastro do item, e sim na renderização da página pública da loja.

- No dashboard (`MenuTab`) categorias customizadas aparecem normalmente (ex.: **"feijoada aos sábados"**).
- Na página pública do cliente (`UnitPage`), o agrupamento usa **apenas** `CATEGORIES` fixas.
- Resultado: itens em categoria nova/customizada ficam salvos no backend, mas **não entram na lista exibida ao cliente**.

Também confirmei no banco da loja atual:
- categoria customizada `"feijoada aos sábados"` com 3 itens.
- por isso exatamente esse bloco não aparece para os clientes.

## O que será alterado

### 1) `src/pages/UnitPage.tsx` — incluir categorias customizadas na montagem do cardápio

Hoje:
- `groupedMenuForObserver` usa `CATEGORIES` fixas.
- `groupedMenu` usa `CATEGORIES` fixas.

Mudança:
- montar grupos em 2 partes:
  1. categorias padrão (`CATEGORIES`) na ordem atual
  2. categorias customizadas detectadas dinamicamente a partir dos itens (`menuItems` / `filteredMenuItems`)
- para customizadas, usar emoji fallback (ex.: `🍽️`) para não quebrar o layout de chips.

## 2) Ajustar navegação por categorias (chips + scroll)

Como a barra de categorias e o observer dependem dos grupos:
- aplicar a mesma lógica dinâmica no `groupedMenuForObserver`.
- manter comportamento atual (chips, rolagem, seção ativa), agora incluindo categorias novas.

## 3) Garantir consistência com busca

Quando houver busca (`searchQuery`):
- `groupedMenu` continuará baseado em `filteredMenuItems`, mas agora incluindo customizadas.
- isso garante que produto novo em categoria nova apareça tanto na lista normal quanto no resultado de busca.

## Arquivo único a editar

```text
EDIT: src/pages/UnitPage.tsx
  - Substituir montagem fixa de groupedMenuForObserver e groupedMenu
  - Adicionar detecção de categorias customizadas
  - Mesclar [categorias padrão + categorias customizadas]
  - Definir emoji fallback para customizadas
```

## Seção técnica (implementação proposta)

```text
1) Criar helper local para grupos:
   buildGroups(sourceItems):
     - knownSet = Set(CATEGORIES.value)
     - knownGroups = CATEGORIES -> filtra itens por categoria
     - customValues = unique(sourceItems.category not in knownSet), ordenado localeCompare(pt-BR)
     - customGroups = customValues.map(value => ({ value, emoji: "🍽️", items: ... }))
     - return [...knownGroups, ...customGroups].filter(g => g.items.length > 0)

2) Aplicar helper em:
   - groupedMenuForObserver = buildGroups(menuItems)
   - groupedMenu = buildGroups(filteredMenuItems)

3) Não alterar backend, tabelas, RLS ou hooks de persistência.
```

## Impacto esperado

Após essa correção:
- ao criar categoria/nome novo no dashboard e adicionar produtos, os clientes verão normalmente no cardápio público;
- produtos duplicados dentro de categoria customizada também aparecerão;
- problema relatado de “não aparece nem nome nem produto” para esse cenário deixa de ocorrer.

## Validação recomendada (E2E)

1. No dashboard, criar categoria nova (ex.: `Feijoada aos sábados`) e adicionar 1–2 produtos.
2. Abrir a página pública da loja (`/unidade/:slug`).
3. Confirmar:
   - chip da nova categoria aparece;
   - seção da categoria aparece;
   - produtos aparecem e podem ser adicionados ao carrinho;
   - busca encontra esses produtos.
