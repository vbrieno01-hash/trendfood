

## Diagnóstico

No modal "Adicionar item" (`MenuTab.tsx` linhas 1251-1277), os chips de categoria mostram **apenas** as categorias sugeridas hardcoded de `CATEGORIES` (Destaques, Promoções, Combos, Bebidas, etc.). As categorias que a própria loja já criou (ex: "Coxinhas", "Cabelo Feminino", "Camisetas Oversize") **não aparecem como chip** — só dá pra reusar digitando manualmente no input de texto, o que é chato e arriscado (lojista digita errado e cria duplicada tipo "Bebidas " vs "Bebidas").

## Solução

**Mostrar as categorias existentes da loja como chips no topo, antes/junto das sugeridas.**

### Mudança em `MenuTab.tsx` (seção do form, ~linha 1251)

1. Calcular `existingCategories` a partir de `items` (categorias únicas que já têm produto cadastrado)
2. Renderizar 2 grupos de chips:
   - **"Suas categorias"** (se houver): chips com as categorias já criadas pela loja, em destaque
   - **"Sugestões"**: chips das `CATEGORIES` hardcoded que ainda não estão na loja (filtra duplicatas)
3. Manter o input de texto livre embaixo pra criar nova personalizada
4. Visual: chips de "suas categorias" com leve destaque (border mais firme, ou ícone ✓ pequeno se quiser) pra deixar claro que já existem

### Pseudocódigo

```tsx
const existingCategories = [...new Set(items.map(i => i.category))].sort();
const suggestedNotUsed = CATEGORIES
  .map(c => c.value)
  .filter(v => !existingCategories.includes(v));

// Render:
{existingCategories.length > 0 && (
  <>
    <p className="text-xs text-muted-foreground mb-1">Suas categorias</p>
    <div className="flex flex-wrap gap-1.5 mb-2">
      {existingCategories.map(cat => <chip />)}
    </div>
  </>
)}
<p className="text-xs text-muted-foreground mb-1">Sugestões</p>
<div className="flex flex-wrap gap-1.5 mb-2">
  {suggestedNotUsed.map(cat => <chip />)}
</div>
<Input placeholder="Ou digite uma categoria personalizada..." />
```

## Arquivo afetado

- `src/components/dashboard/MenuTab.tsx` — apenas a seção do modal de criar/editar item (~linhas 1251-1277)

## O que NÃO vou mexer

- Hook `useMenuItems`, `CATEGORIES`, ordenação, pause de categorias, emoji picker
- Banco, RLS, edge functions
- Vitrine pública

## Resultado esperado

Lojista clica em "Adicionar item":
- Se ela já criou "Coxinhas", "Salgados", "Bebidas" no cardápio → esses 3 aparecem como chips clicáveis no topo
- Embaixo as sugestões genéricas (Destaques, Combos, etc.) que ainda não tem
- 1 clique pra reusar categoria existente, sem digitar nada
- Zero risco de duplicar categoria por erro de digitação

## Risco

Mínimo. Mudança puramente visual em 1 trecho do modal. Sem migração, sem nova lógica de negócio.

