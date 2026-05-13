## Tema automático extraído da logo (Auto Brand Color)

Quando o lojista sobe a logo, o sistema extrai a cor dominante vibrante e gera uma paleta profissional aplicada em toda a loja pública (cards, drawer, header, botões). Funciona para todas as lojas — novas e existentes — com fallback inteligente e override manual opcional.

### Comportamento

- Logo azul → loja azul profissional
- Logo vermelha → loja vermelho-marca
- Logo preta/cinza → tema escuro elegante neutro
- Logo colorida → pega o tom dominante vibrante
- Lojista que quiser controle fino desliga "Auto" e edita manualmente

### Arquitetura

**1. Lib de extração: `node-vibrant`** (~30kb gzip, Canvas API client / Image server)

**2. Algoritmo de paleta (`src/lib/extractBrandPalette.ts`)**
- Roda Vibrant na imagem → 6 swatches
- Pega na ordem: `Vibrant` → `DarkVibrant` → `Muted` → `DarkMuted`
- Converte para HSL e clampa para faixa profissional:
  - Saturação: 45-75% (evita berrante e lavado)
  - Luminosidade: 42-55% (contraste OK em fundo claro e escuro)
- Se saturação < 10% (logo monocromática) → usa preset neutro escuro `#1f2937`
- Deriva:
  - `primary_color` = cor base ajustada
  - `gradient_color` = primary com L −15%
  - `accent_text_color` = primary
  - `header_text_color` = `#fff` ou `#000` por contraste WCAG contra `gradient_color`

**3. Persistência**
- Salva em `organizations.theme_config.auto_palette = { logo_hash, primary, gradient, accent, header_text }`
- `theme_config.color_mode = "auto" | "manual"` (default `auto`)
- `logo_hash` = hash do URL da logo. Se mudar, recomputa.
- Sem migration estrutural — `theme_config` já é JSONB livre.

**4. Aplicação no storefront (`UnitPage.tsx`)**
- Se `color_mode === "auto"` (ou ausente) e `auto_palette` existe → usa essas cores
- Se `color_mode === "manual"` → usa cores manuais como hoje
- Cards, drawer, header, botões já leem `org.primary_color` / `accent_text_color` (depois da correção anterior)

**5. UI no Perfil da Loja (`StoreProfileTab.tsx`)**
- Toggle no topo da seção Aparência: **🎨 Tema automático (extraído da logo)** — default ON
- ON: mostra preview da paleta (3 chips: primary, gradient, accent) + botão "🔄 Recalcular"
- OFF: libera color pickers manuais existentes
- Ao salvar uma logo nova → dispara extração e atualiza preview ao vivo

**6. Backfill para lojas existentes (`backfill-auto-themes` edge function, one-shot)**
- Lê todas orgs com logo e sem `auto_palette`
- Baixa logo via `fetch`, extrai paleta server-side com `npm:node-vibrant`
- Salva em `theme_config.auto_palette` + `color_mode = "auto"`
- Botão de disparo no Admin Panel (restrito ao admin)

### Arquivos

**Novos:**
- `src/lib/colorUtils.ts` — HSL ↔ HEX, contraste WCAG, hash de string
- `src/lib/extractBrandPalette.ts` — `extractFromImage(url)` com clamp e fallbacks (client-side)
- `supabase/functions/backfill-auto-themes/index.ts` — backfill server-side

**Editados:**
- `package.json` — adiciona `node-vibrant`
- `src/components/dashboard/StoreProfileTab.tsx` — toggle auto/manual + preview + recalcular ao trocar logo
- `src/pages/UnitPage.tsx` — lê `auto_palette` quando `color_mode === "auto"`
- `src/components/admin/PlatformConfigSection.tsx` — botão "Recalcular temas de todas as lojas"

### Detalhes técnicos

- `node-vibrant` no client usa `<canvas>` para amostrar pixels. CORS resolvido via Supabase Storage (logos já públicas).
- Server-side (edge): `npm:node-vibrant@4` com `Buffer` + `sharp` opcional. Se `sharp` complicar no Deno, usar `npm:colorthief` como fallback (também Canvas-free no servidor via `pureimage`).
- Clamp HSL pseudocódigo:
  ```
  const { h, s, l } = rgbToHsl(rgb);
  if (s < 10) return NEUTRAL_DARK_PALETTE;
  const s2 = clamp(s, 45, 75);
  const l2 = clamp(l, 42, 55);
  return hslToHex(h, s2, l2);
  ```
- Contraste header text: luminância relativa (WCAG) do gradient → > 0.5 retorna `#000`, senão `#fff`.

### Resultado

Lojista sobe a logo e a loja inteira já abre **com a cor da marca**, profissional, com contraste validado. Zero configuração necessária. Custo: extração 1x por logo, fica em cache no banco.
