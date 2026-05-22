## O bug

Na landing page, a imagem do hero (hambúrguer) "pisca" / troca rapidamente quando a página carrega.

**Causa raiz:** o componente `HeroCinematic` recebe a URL da imagem via `usePlatformContent()` (CMS no banco). Enquanto o CMS não carrega, é usado um **fallback hard-coded** (uma foto do Unsplash) — e quando o CMS responde, a imagem real (webp do Storage) substitui o fallback. Resultado: dois renders visíveis = "pisca".

- Fallback atual em `src/pages/Index.tsx:187`: `https://images.unsplash.com/photo-1514933651103-005eec06c04b…`
- Imagem real no CMS: `…/storage/v1/object/public/site-images/cms/1774980403068.webp`

## A correção

Editar apenas a apresentação do hero — sem mexer em lógica de negócio, CMS, storage ou imagens das lojas.

### Mudanças

1. **`src/pages/Index.tsx`**
   - Passar para o `HeroCinematic` a URL **só quando o CMS já carregou** (ex.: passar `heroImageUrl={cms ? c("hero_image_url", "") : ""}`).
   - Deixar de usar a URL do Unsplash como fallback visível.

2. **`src/components/landing/HeroCinematic.tsx`**
   - Se `heroImageUrl` estiver vazio, **não renderizar o `<img>`** — mostrar apenas o fundo escuro (mesmo `bg-background` / gradient já existente atrás da imagem) como placeholder.
   - Quando a URL chegar, renderizar a `<img>` com `fetchPriority="high"` + uma transição suave `opacity` (fade-in curto, ~200ms via Tailwind) ao disparar `onLoad`, para não dar "pop".
   - Manter `loading="eager"` e `decoding="async"` para o LCP continuar rápido.

### Por que assim

- Elimina o flash: o usuário nunca vê a imagem errada.
- Não atrasa o LCP percebido: o fundo escuro do hero + texto já aparecem imediatamente; só a foto entra suavemente.
- Não toca em nenhum dado de loja, produto, storage ou cache global — é puramente frontend/apresentação na landing.

### Fora do escopo
- Não mexer em outras páginas, lojas, produtos, dashboard, admin.
- Não trocar a imagem do CMS nem mexer no Storage.
- Não alterar `usePlatformContent`.