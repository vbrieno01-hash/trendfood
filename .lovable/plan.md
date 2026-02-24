

## Plano: Categoria editavel (texto livre) no formulario de item

### O que muda para o usuario
Em vez de um dropdown fechado com categorias fixas, o campo de categoria tera um **combobox**: o usuario pode selecionar uma das categorias sugeridas OU digitar qualquer texto personalizado (ex: "Pecas de Computador", "Roupas", "Acessorios").

### Alteracoes tecnicas

**1. `src/components/dashboard/MenuTab.tsx`** (formulario do modal, ~linhas 288-300)

Substituir o `<Select>` por um campo que combina sugestoes com entrada livre:
- Usar um `<Input>` com um `<datalist>` HTML nativo, ou um combo de `Input` + lista de sugestoes
- A abordagem mais simples e robusta: trocar o `Select` por um `Input` com `<datalist>` que lista as categorias predefinidas como sugestoes, mas permite digitar qualquer valor
- O `datalist` e nativo do navegador, leve, e funciona bem em mobile/Android

O codigo do campo ficara assim:
```tsx
<div>
  <Label className="text-sm font-medium">Categoria</Label>
  <Input
    list="category-suggestions"
    value={form.category}
    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
    placeholder="Ex: Lanches, Bebidas, Roupas..."
    className="mt-1"
  />
  <datalist id="category-suggestions">
    {CATEGORIES.map((c) => (
      <option key={c.value} value={c.value} />
    ))}
  </datalist>
</div>
```

**2. `src/hooks/useMenuItems.ts`** (ordenacao por categoria, linha 41)

Atualizar a logica de `CATEGORY_ORDER` para tratar categorias personalizadas: categorias que nao estao no array predefinido aparecem no final da listagem, ordenadas alfabeticamente.

**3. `src/components/dashboard/MenuTab.tsx`** (agrupamento na listagem)

A logica de agrupamento (`grouped`) ja funciona com qualquer valor de `category` — ela usa `items.filter(i => i.category === cat.value)`. Precisa apenas incluir categorias personalizadas (que nao estao em `CATEGORIES`) como grupos adicionais no final.

### Resumo de arquivos alterados
- `src/components/dashboard/MenuTab.tsx` — campo de categoria vira input editavel + agrupamento inclui categorias personalizadas
- `src/hooks/useMenuItems.ts` — ordenacao trata categorias customizadas

