
# Corrigir o scroll do cardápio que volta sozinho

## Causa do Problema

No arquivo `src/pages/UnitPage.tsx`, o `IntersectionObserver` tem esta lógica:

```tsx
([entry]) => {
  if (entry.isIntersecting) {
    setActiveCategory(group.value);
    // PROBLEMA: Este scrollIntoView está causando o jump!
    const pill = document.getElementById(`pill-${group.value}`);
    pill?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }
},
```

Quando o usuário rola a página para baixo, o observer detecta a seção visível e chama `pill?.scrollIntoView(...)`. O `scrollIntoView` pode interferir com o scroll principal da página (window scroll), especialmente em mobile, causando o efeito de "voltar sozinho".

## Solução

**Substituir `scrollIntoView` pelo scroll manual na nav bar**, usando `scrollLeft` diretamente no container da nav, sem afetar o scroll da página principal.

Também vou **adicionar um flag de controle** (`isScrollingByClick`) para evitar que o observer interfira quando o próprio usuário clicar em uma pill (o que causaria duplo scroll).

### Mudanças em `src/pages/UnitPage.tsx`

**1. Adicionar um ref de controle de clique:**
```tsx
const isScrollingByClick = useRef(false);
```

**2. Corrigir o callback do IntersectionObserver** — remover o `scrollIntoView` e substituir por scroll manual no container da nav:
```tsx
([entry]) => {
  if (entry.isIntersecting && !isScrollingByClick.current) {
    setActiveCategory(group.value);
    // Scroll manual da pill na nav — não afeta o scroll da página
    const navEl = categoryNavRef.current;
    const pill = document.getElementById(`pill-${group.value}`);
    if (navEl && pill) {
      const pillLeft = pill.offsetLeft - navEl.offsetLeft;
      const pillCenter = pillLeft - navEl.clientWidth / 2 + pill.clientWidth / 2;
      navEl.scrollTo({ left: pillCenter, behavior: "smooth" });
    }
  }
},
```

**3. Corrigir o `scrollToCategory`** — setar o flag antes de rolar e liberar depois:
```tsx
const scrollToCategory = (value: string) => {
  setActiveCategory(value);
  isScrollingByClick.current = true;
  const el = document.getElementById(`cat-${value}`);
  if (el) {
    const offset = 110;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  }
  // Libera o flag após o tempo do scroll suave (~700ms)
  setTimeout(() => { isScrollingByClick.current = false; }, 800);
};
```

## Por que isso resolve

- O `scrollIntoView` nativo pode afetar qualquer scroll pai, incluindo o `window`, causando o "pulo" indesejado na página.
- O scroll manual via `navEl.scrollTo()` afeta **apenas** o container horizontal da nav bar, sem tocar no scroll vertical da página.
- O flag `isScrollingByClick` evita conflito quando o usuário clica numa pill (o observer não vai sobrescrever o scroll programático).

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `src/pages/UnitPage.tsx` | Corrigir callback do IntersectionObserver e função `scrollToCategory` |
