

## Diagnóstico do Erro Encontrado

O erro já está registrado no banco e visível na aba Logs. Não há necessidade de mudanças de código para este diagnóstico.

### Erro identificado

| Campo | Valor |
|-------|-------|
| Mensagem | `Rejected` |
| Source | `unhandled_rejection` |
| URL | `/dashboard?tab=home` |
| User Agent | Google-Read-Aloud bot (Android Chrome 138) |
| Data | 24/02/2026 15:30 |

### Causa raiz

O bot do Google (Google-Read-Aloud) acessou a página e tentou registrar o Service Worker via PWA. Bots não suportam SW, então a promise foi rejeitada com "Rejected". Isso gerou um `unhandledrejection` que o sistema capturou corretamente.

### Ação recomendada

Este erro é **inofensivo** — não afeta nenhum usuário real. Para evitar ruído desse tipo no painel, existem duas opções:

1. **Filtrar bots no `errorLogger.ts`** — antes de fazer o insert, verificar se o `navigator.userAgent` contém strings de bots conhecidos (Googlebot, Google-Read-Aloud, bingbot, etc.) e ignorar o erro.

2. **Tratar a rejeição do SW** — no `vite-plugin-pwa` ou no `registerSW.js`, adicionar um `.catch()` na chamada de `navigator.serviceWorker.register()` para que a promise não fique "unhandled".

### O que confirma que funciona

O fato de esse erro ter aparecido no banco prova que o pipeline completo está operacional:
- Captura global de `unhandledrejection` no `App.tsx`
- `logClientError()` fez o insert no banco
- RLS pública para INSERT permitiu a gravação
- A aba Logs no admin pode exibir o registro (com RLS admin para SELECT)

### Detalhes técnicos

Para filtrar bots, seria adicionada uma verificação no início da função `logClientError`:

```typescript
const BOT_PATTERN = /googlebot|google-read-aloud|bingbot|yandex|baidu|duckduckbot/i;
if (BOT_PATTERN.test(navigator.userAgent)) return;
```

Isso evitaria poluir os logs com erros de crawlers que não representam problemas reais da aplicação.

