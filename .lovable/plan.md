

## Plano: Corrigir mismatch de chaves VAPID

### Problema
O cliente (`usePushSubscription.ts`) usa a chave VAPID pública **antiga** (`BL022VmP...`), mas os secrets do backend têm a chave **nova** (`BBATtReM...`). As subscriptions no navegador foram criadas com a chave antiga, então o push server (Google/Mozilla) rejeita com **403**.

### Correção

| # | O que |
|---|-------|
| 1 | Atualizar `VAPID_PUBLIC_KEY` em `src/hooks/usePushSubscription.ts` para `BBATtReMYYfX0TzAWOBYZkVAZlvUZlQJGI-YRtlqpPRo3Y0enwYdArCVl4R1TzyoeJuPD8gbSlKippNGaim-6QM` |
| 2 | Limpar subscriptions antigas do banco (foram criadas com chave errada) |
| 3 | O lojista precisará reativar as notificações no dashboard (toggle do sino) para criar nova subscription com a chave correta |

### Detalhes técnicos
- A chave no cliente **deve** ser idêntica à `VAPID_PUBLIC_KEY` nos secrets do backend
- Subscriptions existentes são inválidas porque o push service vincula a subscription à chave VAPID usada na criação
- Migração SQL: `DELETE FROM push_subscriptions;` para limpar as subscriptions incompatíveis

### Resultado
- 1 arquivo editado (`usePushSubscription.ts`)
- 1 migração (limpar subscriptions antigas)
- Push notifications funcionando após o lojista reativar o sino

