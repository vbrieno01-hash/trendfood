# Plano: Corrigir tema automático que não recalcula ao trocar a logo

## Diagnóstico

Em `src/lib/extractBrandPalette.ts` o fluxo é:

```ts
const cleanUrl = normalizeUrl(logoUrl);   // remove "?t=12345"
const img = await loadImage(cleanUrl);    // <-- carrega a URL SEM cache-buster
```

E `loadImage` usa `<img crossOrigin="anonymous">`. O upload da logo em `StoreProfileTab.handleLogoUpload` sempre grava no mesmo path (`<orgId>/logo.<ext>`, `upsert: true`) e gera a URL com `?t=Date.now()` **justamente para furar o cache do navegador**. Mas a função de extração descarta o cache-buster antes de baixar — então o `<img>` devolve a logo antiga do disk cache, a "cor dominante" continua igual e o tema nunca muda.

O cache-buster é descartado de propósito só pra hashear a URL canônica (`logo_hash`). O bug é usar essa URL canônica também no `loadImage`.

## Correção

`src/lib/extractBrandPalette.ts`:
- Manter `cleanUrl` apenas para gerar o `quickHash`.
- Passar a URL **original** (com `?t=...`) para `loadImage`, garantindo bypass de cache.
- Se a URL recebida não tem cache-buster, anexar `?cb=Date.now()` antes de baixar (defesa pro botão "Recalcular", que recebe a `logoUrl` já em estado, possivelmente sem buster fresco).

Resultado: cada upload/recalcular busca a imagem nova de fato e a paleta é recomputada.

## Fora de escopo
- Não mexer em `colorUtils`, no UI da aba, no fluxo multi-loja ou em qualquer outra lógica.
- Não tocar em CORS do bucket (já está OK porque `crossOrigin="anonymous"` funciona — o problema é só o cache HTTP).
