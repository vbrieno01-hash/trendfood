

## Carregar Google Fonts no StoreProfileTab para preview funcionar

### Problema
Os botões de seleção de fonte usam `fontFamily` inline, mas as fontes do Google Fonts **nunca são carregadas** no dashboard. Só o `UnitPage.tsx` (loja pública) injeta o `<link>` do Google Fonts. Resultado: apenas fontes que o navegador já tem instaladas (como as 3 primeiras) mostram diferença visual.

### Correção
**`src/components/dashboard/StoreProfileTab.tsx`** — Adicionar um `useEffect` que carrega todas as 6 fontes do Google Fonts quando o componente monta:

```tsx
useEffect(() => {
  const families = ["Inter", "Merriweather", "Nunito", "Roboto", "Poppins", "Open+Sans"];
  const query = families.map(f => `family=${f}:wght@400;600;700`).join("&");
  const id = "store-profile-gfonts";
  if (!document.getElementById(id)) {
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${query}&display=swap`;
    document.head.appendChild(link);
  }
}, []);
```

Uma adição de ~10 linhas, zero mudança de lógica. Todas as 7 opções (incluindo Padrão) passarão a renderizar com a fonte correta nos botões e no mini-preview.

