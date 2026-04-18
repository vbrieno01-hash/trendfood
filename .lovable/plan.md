
## O que vou fazer

Abrir `https://trendfood.lovable.app` no browser de teste, esperar uns segundos, filtrar o console por `VersionPoller` e te reportar:

1. Se o log inicial `[VersionPoller] fingerprint inicial: ...` aparece (prova que o hook tá montado e rodando fora do iframe)
2. Se aparece algum `[VersionPoller] tick (60s)` ou `visibility/focus` (prova que o polling tá ativo)
3. Se aparece `[VersionPoller] NOVA VERSÃO detectada via index.html` (só vai aparecer se a sessão do browser tinha um fingerprint antigo em cache E você publicou depois — caso contrário o fingerprint inicial já é o novo e nada vai mudar)

## Limitação honesta do teste

O browser de teste abre uma sessão **nova** — não tem o fingerprint antigo guardado de antes do seu publish. Então:

- ✅ Consigo confirmar que o poller está **ativo** e logando (init + ticks)
- ⚠️ **Não consigo** reproduzir a detecção real de "nova versão" porque pra isso a aba teria que estar aberta **antes** do publish. Esse teste só você consegue fazer numa loja que já tava aberta.

O que eu posso fazer pra simular: abrir a página, esperar o init logar, e tu publica algo trivial agora — aí eu volto pra aba e vejo se o `visibility/focus` detecta. Mas isso requer coordenação entre nós.

## Plano

1. `navigate_to_url` → `https://trendfood.lovable.app`
2. Aguardar ~3s
3. `read_console_logs` filtrando por `VersionPoller`
4. Reportar o que vi + recomendar próximo passo (se logs ausentes → bug; se só init aparece → normal, peço pra você publicar e eu volto pra aba)

## Risco
Zero. Operação read-only no browser.
