
## Problema

Botão "Verificar atualizações" sempre diz "Você está na versão mais recente" — mesmo quando você sabe que tem deploy novo.

## Causa raiz

Em `useVersionPoller.ts` linha ~94 (função `checkNow`):

```ts
const initial = initialFpRef.current;
const changed = !!(initial && current && current !== initial);
```

O `initialFpRef.current` é setado no boot com **o fingerprint atual do servidor** (que já é o mais novo, já que você acabou de carregar a página). Então `initial === current` sempre, e `checkNow` sempre retorna `false`.

O `pwa_last_seen_fp` (snapshot da sessão anterior) é usado **só uma vez no boot** pra disparar `hasNewVersion=true` automaticamente. Mas se já passou desse momento (ou se você acabou de atualizar e o `LAST_SEEN_FP_KEY` já foi sobrescrito com o atual), o `checkNow` manual nunca vai achar nada — ele compara o atual contra ele mesmo.

Pior: o botão é projetado pra ser usado **dias depois** quando sai um deploy novo. Mas como o `initialFpRef` é fixado no mount da sessão, mesmo se sair um deploy novo enquanto a aba tá aberta, ele só vai detectar via polling de 60s — o `checkNow` manual continua comparando contra o snapshot do mount, que é **a mesma versão que tá rodando agora no browser**.

Espera — esse caso o `checkNow` deveria funcionar (versão do browser ≠ versão nova no servidor). Deixa eu reler...

Na verdade funciona pra esse caso: se sair deploy enquanto a aba tá aberta, `current` (fetch novo) ≠ `initial` (fetch do mount) → detecta. ✅

**Mas** o caso que tá quebrando é: você publica → fecha a aba → abre de novo → clica no botão. Agora:
- Boot: persiste fingerprint A no localStorage, fixa `initialFpRef = A`
- Você clica: fetch retorna A → `current === initial` → "tá atualizado" ❌

O botão **só funciona** se um novo deploy sair **entre o mount e o clique**. Pra qualquer outro caso (que é 99% dos cliques manuais), ele sempre diz "tá na versão mais recente".

## Solução

Mudar a semântica do botão "Verificar atualizações" pra fazer o que o usuário espera: **forçar reload com cache-bust pra garantir que tá rodando a última versão publicada**, em vez de comparar fingerprints (que sempre vão bater, porque o fingerprint atual é o que o browser carregou).

### Plano

**Opção A (recomendada):** Botão sempre executa `nukeAndReload()` direto. Mostra um toast tipo "Buscando última versão..." e recarrega com `?_v=timestamp`. Se o servidor tiver mesma versão, o reload é rápido e tudo continua igual. Se tiver versão nova, o usuário ganha ela na hora. Sem falsos negativos, sem confusão.

**Opção B:** Manter check, mas comparar contra um endpoint sempre-fresco (ex: header `ETag` do `index.html` ou hash MD5 do conteúdo). Mais complexo, mais chance de bug.

Vou de **Opção A**.

### Mudanças

**1. `VersionCheckCard.tsx`** — `onCheck` chama direto `handleUpdate()`:
- Toast: "Atualizando para a última versão..."
- Chama `handleUpdate()` (que já faz `nukeAndReload`)
- Sem mais "Você está na versão mais recente" enganoso

**2. Texto do card** — atualizar copy pra refletir o comportamento real:
- Botão: "Atualizar agora" (em vez de "Verificar atualizações")
- Descrição: "Clique para forçar a busca da versão mais recente do sistema."

**3. `usePWAUpdate.ts`** — manter `checkNow` exportado intacto (outros lugares usam), mas o card não depende mais dele.

## Arquivos

- `src/components/dashboard/VersionCheckCard.tsx` — simplificar `onCheck`, ajustar copy
