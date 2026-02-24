

## Plano: Manter categorias predefinidas como botoes selecionaveis + campo editavel

### O que muda
O campo de categoria tera duas partes:
1. **Lista de botoes/chips** com as categorias predefinidas (CATEGORIES) — o usuario clica para selecionar rapidamente
2. **Um input de texto** abaixo, para digitar uma categoria personalizada

Ao clicar em um chip predefinido, o valor do input e preenchido automaticamente. Se o usuario quiser algo diferente, digita no input. O input sempre mostra o valor atual.

### Alteracao tecnica

**`src/components/dashboard/MenuTab.tsx`** (~linhas 513-528)

Substituir o `Input + datalist` atual por:

```tsx
<div>
  <Label className="text-sm font-medium">Categoria</Label>
  {/* Chips das categorias predefinidas */}
  <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
    {CATEGORIES.map((c) => (
      <button
        key={c.value}
        type="button"
        onClick={() => setForm((p) => ({ ...p, category: c.value }))}
        className={cn(
          "px-2.5 py-1 rounded-full text-xs border transition-colors",
          form.category === c.value
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-muted hover:bg-muted/80 border-border"
        )}
      >
        {c.emoji} {c.value}
      </button>
    ))}
  </div>
  {/* Input editavel para categoria personalizada */}
  <Input
    value={form.category}
    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
    placeholder="Ou digite uma categoria personalizada..."
    className="text-sm"
  />
</div>
```

### Comportamento
- Clicar num chip preenche o input com aquele valor (chip fica destacado)
- Digitar no input permite qualquer texto livre (se nao bater com nenhum chip, nenhum fica destacado)
- O agrupamento na listagem continua funcionando igual — categorias personalizadas aparecem no final

### Arquivo alterado
- `src/components/dashboard/MenuTab.tsx` — campo de categoria com chips + input

