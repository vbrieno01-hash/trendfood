
## O que o usuário quer

Confirmação real, não teórica, de que o fluxo de atualização voltou a funcionar como antes. Já validei via browser tool que o poller logga `init` e `tick (60s)` em `trendfood.lovable.app`. Mas isso só prova que ele tá **vivo** — não prova que ele **detecta** uma versão nova.

## Diagnóstico honesto

Pra responder "voltou a atualizar igual antes?" com certeza preciso de UMA das duas coisas:

**Opção A — Teste coordenado (mais confiável)**
1. Eu abro `trendfood.lovable.app` no browser de teste
2. Confirmo o `[VersionPoller] fingerprint inicial: XXX`
3. Você publica uma mudança trivial agora (ex: troca um espaço em branco)
4. Eu volto pra aba (dispara `visibility/focus`) ou espero até 60s
5. Confirmo no console se aparece `[VersionPoller] NOVA VERSÃO detectada via index.html` E se o card "Nova versão disponível" aparece na UI

Isso prova end-to-end: detecção + UI + (opcionalmente) clicar Atualizar e ver o `nukeAndReload`.

**Opção B — Teste sintético (rápido, menos completo)**
Eu abro a loja, capturo o fingerprint inicial, e via DevTools/console manipulo o `initialFpRef` pra simular uma versão antiga. Aí o próximo tick deve detectar "mudança". Isso valida a lógica de comparação mas não o fluxo real de deploy.

## Recomendação

Opção A. É 5 minutos coordenados e te dá a resposta definitiva que você quer ouvir ("sim, voltou" ou "não, ainda tem bug X").

## Plano de execução (Opção A)

1. `browser--navigate_to_url` → `https://trendfood.lovable.app`
2. `browser--read_console_logs` filtrando `VersionPoller` → capturo fingerprint inicial e te mostro
3. **Pauso e te aviso**: "Publica agora uma mudança trivial"
4. Você publica → me responde "publiquei"
5. `browser--navigate_to_url` na mesma URL de novo (força revisita, dispara visibility) OU espero 60s e leio logs
6. `browser--read_console_logs` → procuro `NOVA VERSÃO detectada`
7. `browser--screenshot` da UI → confirmo se o card de update aparece
8. Reporto o veredito final: ✅ funcionando OU ❌ bug X identificado

## Risco
Zero. Tudo read-only no browser. Você só publica uma mudança trivial (um espaço a mais em qualquer arquivo) e reverte depois se quiser.

## O que NÃO faço
- Não publico por você
- Não mudo código nessa rodada (só teste)
- Não confirmo "tá funcionando" sem prova real — se o teste falhar, te aviso e a gente debuga
