
## Diagnóstico — o botão NÃO está 100% confiável

Achei 2 bugs reais analisando o fluxo de clique:

### Bug 1 — `checkNow()` retorna estado defasado (race condition)
Em `usePWAUpdate.ts` linha 102-114:
```ts
const checkNow = async (): Promise<boolean> => {
  await fetch(`/index.html?ts=${...}`, { cache: "no-store" });  // joga fora a resposta!
  await new Promise((r) => setTimeout(r, 500));  // espera 500ms torcendo
  return serverHasNewVersion;  // valor capturado no closure — pode tar desatualizado
};
```

**Problemas:**
1. Faz `fetch` mas **descarta a resposta** — o resultado não é usado pra nada
2. Espera 500ms na esperança de o `useVersionPoller` rodar — mas o poller só checa a cada **60 segundos** ou em focus/visibility. Os 500ms quase nunca disparam um check novo
3. Retorna `serverHasNewVersion` — o valor capturado quando `checkNow` foi criado. Se o React não tiver re-renderizado, retorna `false` mesmo havendo nova versão

**Resultado prático:** clica no botão → 90% das vezes mostra "Você está na versão mais recente ✓" mesmo quando tem versão nova publicada.

### Bug 2 — Sem fonte de verdade compartilhada
O `useVersionPoller` mantém o `initialFp` em escopo do `useEffect` — não é exposto. O `checkNow` não tem como pedir "compara agora e me devolve true/false na hora". Depende 100% de o estado do React ter atualizado, o que é assíncrono.

### Impacto
- Botão "Verificar atualizações" passa falsa segurança ao lojista
- Lojista clica, vê "está atualizado", e continua na versão velha
- Pior que não ter o botão, porque mente

## Plano de correção

### Frente 1 — Refatorar `useVersionPoller.ts`
Expor uma função `checkNow()` síncrona/assíncrona que:
- Faz fetch do `/index.html` agora
- Compara fingerprint com o inicial **dentro da própria função**
- Retorna `true`/`false` direto, sem depender de re-render do React
- Também atualiza o estado interno (pra o card global aparecer)

Mudar a assinatura de:
```ts
export function useVersionPoller(): boolean
```
Para:
```ts
export function useVersionPoller(): { hasNewVersion: boolean; checkNow: () => Promise<boolean> }
```

### Frente 2 — Atualizar `usePWAUpdate.ts`
- Consumir o novo formato do poller
- `checkNow` do hook delega pro `checkNow` do poller (verdade real, não closure)
- Remover o `setTimeout(500)` e o fetch descartado

### Frente 3 — Atualizar `VersionCheckCard.tsx`
- Sem mudança de UI
- Já consome `checkNow` via hook — passa a receber resposta correta

### Frente 4 — Logs de observabilidade
Adicionar logs claros no console pro lojista/eu conseguir debugar:
- `[VersionPoller] checkNow → fp atual: xxx | inicial: yyy | mudou: true/false`
- Toast de erro mais informativo se o fetch falhar

## Arquivos afetados
- `src/hooks/useVersionPoller.ts` (refatorar API)
- `src/hooks/usePWAUpdate.ts` (consumir nova API, remover hack do setTimeout)
- `src/components/dashboard/VersionCheckCard.tsx` (sem mudança visual, só herda fix)

## Resultado esperado
- Clicou no botão → fetch real → comparação real → resposta real, em ~200ms
- Se tem versão nova: mostra toast "Nova versão encontrada! Atualizando…" e dispara `nukeAndReload()`
- Se está atualizado: mostra "Você está na versão mais recente ✓" **com confiança**
- Card global (`PWAUpdatePrompt`) continua aparecendo via polling de 60s

## Risco
Baixo. Mudança contida em 2 hooks + 0 mudança visual. Sem mudança de schema, sem efeito colateral em outras telas.
