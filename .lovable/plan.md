
## Plano

Vou voltar pra aba do `trendfood.lovable.app` que já tava aberta com o fingerprint inicial capturado, disparar `visibility/focus` ao revisitar, e ler o console procurando `NOVA VERSÃO detectada`.

## Passos

1. `browser--navigate_to_url` → `https://trendfood.lovable.app` (revisita = dispara visibility)
2. `browser--read_console_logs` filtrando `VersionPoller` → procuro:
   - Novo fingerprint diferente do inicial (`index-CDCG1rgf.css|index-C6-NJeKx.js`)
   - Log `NOVA VERSÃO detectada via index.html`
3. `browser--screenshot` → confirmo se o card "Nova versão disponível" (do `PWAUpdatePrompt`) aparece na UI
4. Reporto veredito:
   - ✅ Detectou + card apareceu → **funcionando igual antes**
   - ⚠️ Detectou no console mas card não apareceu → bug no `PWAUpdatePrompt`
   - ❌ Não detectou → fingerprint não mudou (publish ainda propagando no CDN) ou bug no poller

## Observação importante

Se o publish ainda tá propagando no CDN da Lovable (pode levar 10-30s), o fingerprint pode vir igual. Nesse caso espero um pouco e tento de novo antes de declarar bug.

## Risco
Zero. Read-only no browser.
