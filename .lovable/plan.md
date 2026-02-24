

## Erros Registrados no Banco

Atualmente existe **1 único erro** registrado:

| Campo | Valor |
|-------|-------|
| **Mensagem** | `Rejected` |
| **Source** | `unhandled_rejection` |
| **Stack Trace** | `Error: Rejected` em `registerSW.js` → `navigator.serviceWorker.register()` |
| **URL** | `trendfood.lovable.app/dashboard?tab=home` |
| **User Agent** | Google-Read-Aloud bot (Android Chrome 138) |
| **Data** | 24/02/2026 15:30 |

### Diagnóstico

Este é um erro **inofensivo** causado pelo bot do Google (Google-Read-Aloud) tentando registrar o Service Worker da PWA. Bots não suportam Service Workers, então a promise é rejeitada.

O filtro de bots que acabamos de adicionar no `errorLogger.ts` já vai impedir que esse tipo de erro seja registrado no futuro. Esse log existente é de **antes** do filtro ser aplicado.

### Situação atual

- Nenhum erro de usuário real foi registrado
- O único erro existente é ruído de bot (já filtrado pelo código atualizado)
- O sistema está funcionando corretamente e pronto para capturar erros reais

### Ação sugerida

Limpar esse log antigo pela aba Logs do admin (botão "Limpar") para começar com a base limpa agora que o filtro de bots está ativo.

