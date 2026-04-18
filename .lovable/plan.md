
## Pergunta

"O site do Chapa e Alho vai voltar ao normal?" — você quer saber se a loja dela vai voltar a receber atualizações automáticas igual antes.

## Resposta curta

**Sim, vai.** Não precisa fazer nada do lado dela.

## Por quê

O `VersionPoller` (em `src/hooks/useVersionPoller.ts`) já está deployado no bundle público (`trendfood.lovable.app` → fingerprint atual `index-Dos2BuDA.js`). Como toda loja (incluindo `chapaealho`) é servida pelo **mesmo bundle** via subpath routing (`/unidade/[slug]`), o poller roda automaticamente em **qualquer aba aberta** da plataforma — dashboard, vitrine pública, KDS, etc.

## O que vai acontecer na prática pra ela

1. Próxima vez que ela abrir/focar a aba do dashboard → poller captura o fingerprint inicial
2. A cada 60s (ou quando ela voltar pra aba) → poller compara com o `/index.html` mais recente
3. Quando você publicar uma nova versão → aparece o card **"Nova versão disponível!"** no canto inferior
4. Ela clica "Atualizar agora" → `nukeAndReload()` limpa SWs/caches antigos e recarrega

## Detalhe importante

Se a aba dela tava aberta **antes** do deploy de hoje (que trouxe o `VersionPoller`), ela precisa **recarregar uma vez manualmente** (Ctrl+R) pra pegar o novo bundle com o poller embutido. Depois disso, atualizações futuras viram automáticas de novo.

## Risco
Nenhum. Read-only — só explicação.
