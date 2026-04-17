

## Diagnóstico real (App instalado + nada mudou)

A loja **abriu pelo PWA instalado** na home. Isso muda o jogo porque:

1. **PWA standalone não dispara `focus`/`visibilitychange` da mesma forma** que aba de browser. O lojista abre o ícone, usa, fecha — o app pode ficar **dias sem nunca rodar o `r.update()`** porque os listeners que adicionamos não disparam de forma confiável em standalone.
2. **`onRegisteredSW` só chama `setInterval` UMA vez**, no primeiro registro do SW. Se o app ficou aberto desde antes da última atualização do código (caso comum em PWA instalado que nunca é "fechado" de verdade), o handler pode nem ter sido chamado nessa sessão.
3. **`needRefresh` só vira `true` quando o SW novo é instalado E entra em estado `waiting`** — exige que `r.update()` rode E que o navegador baixe o novo SW E identifique como "waiting". Se o PWA não rodou nenhum check, não detecta nada.
4. **Sem botão manual** para o lojista forçar — ele depende 100% da detecção automática que tá falhando no contexto standalone.

## Solução em 3 frentes (segura, sem mexer em fluxo de pedido)

### Frente 1 — Tornar a detecção mais agressiva e confiável em PWA standalone
Em `src/hooks/usePWAUpdate.ts`:

- **Polling mais curto: de 2 min → 60s** (custo de rede irrelevante, é um HEAD no manifest do SW)
- **Mover o `setInterval` para fora do `onRegisteredSW`** e colocar dentro de um `useEffect` que sempre roda. Garantia que sempre tem polling ativo, não dependendo de quando o SW foi registrado.
- **Adicionar listener `controllerchange`** do `navigator.serviceWorker` — dispara quando um SW novo assume controle, sinal mais direto que algo mudou.
- **Adicionar listener `updatefound` no registration** — dispara assim que o navegador detecta um SW novo baixando, ainda mais cedo que `needRefresh`.
- **Check inicial com delay curto (3s após mount)** além do imediato — cobre race condition de SW ainda registrando.

### Frente 2 — Botão manual "Verificar atualizações" no dashboard
Em `src/components/dashboard/SettingsTab.tsx` (ou na Home/SetupChecklist):

- Card pequeno com botão **"Verificar atualizações"**
- Ao clicar: força `registration.update()`, espera 3s, e:
  - Se achou versão nova → mostra toast "Atualizando..." e dispara `updateServiceWorker(true)`
  - Se não achou → toast "Você está na versão mais recente ✓"
- Solução de emergência pro lojista quando suspeitar que ficou desatualizado.

### Frente 3 — Mostrar versão atual (build hash) na Home
Pequeno texto rodapé tipo `v2025.04.17.1432` (timestamp do build) — o lojista consegue te falar a versão dele e você compara com a publicada. Diagnóstico rápido sem ter que adivinhar.

## Arquivos

- `src/hooks/usePWAUpdate.ts` — refatorar polling + adicionar `updatefound` + `controllerchange`, reduzir pra 60s
- `src/components/dashboard/SettingsTab.tsx` — adicionar card "Verificar atualizações"
- `vite.config.ts` — injetar build timestamp via `define` para exibir versão
- `src/components/dashboard/HomeTab.tsx` (ou `SetupChecklist`) — exibir versão pequena no rodapé

## O que NÃO vou mexer

- Fluxo de pedido, RLS, edge functions, banco — nada disso
- `vite.config.ts` na parte de PWA core (`registerType: "prompt"` fica)
- `main.tsx` guard de iframe/preview

## Risco

Baixo. Mudanças cosméticas + lógica de polling. Sem migração de banco. Sem mexer em nada crítico de pedido/pagamento.

## Resultado esperado pra Caha e Alho

- Polling 1x/min em vez de 2 min → janela máxima de detecção cai pela metade
- `updatefound` pega o SW novo no momento exato que o navegador detecta
- Botão manual = lojista não fica refém da automação
- Versão visível = você diagnostica em 5 segundos pelo WhatsApp

