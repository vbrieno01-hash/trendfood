
# Menu de Navegação Rápida por Categoria (Estilo iFood)

## Diagnóstico do que já existe

Após explorar o código:

- A coluna `category` já existe na tabela `menu_items` do banco de dados.
- O array `CATEGORIES` com emojis e ordem já existe em `src/hooks/useMenuItems.ts`.
- O `MenuTab` do Dashboard já tem o Select de categoria funcionando.
- A `UnitPage` já agrupa os itens por categoria com título e emoji.

**O que FALTA**: a barra de navegação rápida (pills clicáveis no topo do cardápio) que rola a página automaticamente até a seção correspondente.

Nenhuma mudança de banco de dados é necessária. Toda a mudança é exclusivamente visual/comportamental na `UnitPage`.

---

## O que vai mudar para o cliente

Dentro da aba "Cardápio" da página pública, **acima** dos itens, aparecerá uma barra horizontal rolável com chips por categoria:

```
┌────────────────────────────────────────────────┐
│  🍔 Hambúrgueres  🥤 Bebidas  🍟 Porções  ...  │
└────────────────────────────────────────────────┘
```

- Ao clicar em um chip, a página rola suavemente até o título daquela categoria.
- O chip da categoria visível no momento fica destacado (pill ativo com a cor primária do estabelecimento).
- Categorias sem produtos não aparecem nem no menu de navegação nem no cardápio.

---

## Implementação técnica

### 1 — IDs nas seções de categoria

Cada título de categoria recebe um `id` fixo para que o scroll por âncora funcione:

```tsx
<div key={group.value} id={`cat-${group.value}`}>
  <h2>...</h2>
  ...
</div>
```

### 2 — Barra de pills com scroll ativo

Um `useRef` mapeado com `useIntersectionObserver` detecta qual categoria está visível na tela e marca o pill correspondente como ativo:

```tsx
const [activeCategory, setActiveCategory] = useState<string | null>(null);

// IntersectionObserver para detectar seção visível
useEffect(() => {
  const observers = groupedMenu.map((group) => {
    const el = document.getElementById(`cat-${group.value}`);
    if (!el) return null;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setActiveCategory(group.value); },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return obs;
  });
  return () => observers.forEach((o) => o?.disconnect());
}, [groupedMenu]);
```

### 3 — Scroll suave ao clicar

```tsx
const scrollToCategory = (value: string) => {
  const el = document.getElementById(`cat-${value}`);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
};
```

### 4 — Pill ativo com cor primária do estabelecimento

O pill ativo usa `style={{ backgroundColor: primaryColor }}` para respeitar a identidade visual de cada lanchonete, exatamente como o botão "Adicionar" já faz.

---

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/pages/UnitPage.tsx` | Adicionar barra de navegação por categoria com IntersectionObserver e scroll suave |

Nenhum outro arquivo precisa ser alterado.

---

## O que NÃO muda

- Banco de dados: sem migrações.
- `MenuTab` do Dashboard: sem alterações.
- `useMenuItems.ts`, `CATEGORIES`: sem alterações.
- Fluxo do carrinho e WhatsApp: sem alterações.
- Design dos cards de produto: sem alterações.
