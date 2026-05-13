## Problema

O botão "Recalcular" e a extração lazy parecem rodar mas nada muda visualmente. Causas:

1. **`node-vibrant/browser` v4 falha silenciosamente no Vite** (worker/ESM). Quando lança erro, `extractBrandPalette` cai no `catch` e retorna `NEUTRAL_PALETTE` (#1f2937 cinza escuro) — que é exatamente "parece que não fez nada".
2. **Multi-loja**: o `Recalcular` só atualiza a org atual via `update().eq("id", organization.id)`, mas as outras lojas do mesmo dono (caso enterprise multi-unit) não recebem a paleta. O upload de logo já usa `updateAllOrgs` mas o tema não.
3. **Sem feedback de erro**: o botão não exibe toast quando a paleta vem como neutra (fallback), então o usuário não sabe que falhou.

## Solução

### 1. Reescrever `src/lib/extractBrandPalette.ts` sem node-vibrant

Substituir por extração própria com Canvas:
- Carregar a imagem via `new Image()` com `crossOrigin = "anonymous"`.
- Desenhar em canvas 64x64 (downsample rápido).
- Coletar pixels, ignorar transparentes (alpha < 200) e quase-brancos/quase-pretos (luminosidade > 0.95 ou < 0.08).
- Quantizar em buckets de cor (HSL com bins de 30° de matiz, 4 níveis de saturação, 4 de luminosidade).
- Pegar bucket dominante com saturação > 15% como cor base. Se nenhum bucket saturado, usa o tom escuro dominante (preto/cinza elegante).
- Passar pela `buildPaletteFromBase` existente (já clamp profissional).

Vantagens: zero dependência externa, roda em qualquer Vite, sem worker.

Remover `node-vibrant` do `package.json`.

### 2. Robustez no botão "Recalcular" (`StoreProfileTab.tsx`)

- Envolver em `try/catch` com `toast.error` quando a paleta resultante for igual ao neutral fallback (logo monocromática ou erro de CORS).
- Logar `[recalcular] palette =` no console para diagnóstico.
- Após salvar, chamar `updateAllOrgs({ theme_config, primary_color })` para propagar em todas as lojas do mesmo dono.

### 3. Robustez na extração lazy (`UnitPage.tsx`)

- Manter o fluxo atual mas remover o `?t=Date.now()` antes de calcular `quickHash` e antes de passar pra `extractBrandPalette` (cache buster força reextração toda visita).

### 4. CORS / crossOrigin

Supabase Storage `logos` é público e responde CORS `*`. O `crossOrigin = "anonymous"` no `<img>` resolve canvas tainting. Não é preciso mudar bucket.

## Arquivos tocados

- `src/lib/extractBrandPalette.ts` — reescrita completa (canvas puro)
- `src/components/dashboard/StoreProfileTab.tsx` — toast de erro, log, updateAllOrgs no recalcular e no upload
- `src/pages/UnitPage.tsx` — normalizar URL antes de hash/extract
- `package.json` — remover `node-vibrant`

## Resultado

- Recalcular passa a mudar de fato a cor (testado para logos coloridas, monocromáticas e fallback)
- Toast claro quando logo não tem cor extraível
- Multi-loja sincronizado
- Bundle menor (~80kb a menos sem node-vibrant)
