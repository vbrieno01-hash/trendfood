## Diagnóstico

O link novo **já foi salvo no banco** com sucesso:
- `community_whatsapp_url` = `https://chat.whatsapp.com/GPW4EqThH0nCfDzZoscwwi`

O código do `DashboardPage.tsx` lê corretamente esse valor. O motivo de "não atualizar" é o **cache em memória** do hook `usePlatformContent` (TTL de 60s, módulo-level), combinado com o **Service Worker do PWA** que pode estar servindo o app em cache. Por isso o link antigo continua aparecendo até refresh forçado.

## Plano

1. **Reduzir/eliminar cache estático no `usePlatformContent`**
   - Trocar o cache de 60s por um refetch a cada montagem (ou TTL de 5s alinhado ao padrão global).
   - Adicionar listener Realtime na tabela `platform_content` para invalidar o cache automaticamente quando algo é editado no Admin.

2. **Forçar invalidação após salvar no Admin**
   - Já é feito (`cache = null`), mas garantir que outras abas/sessões também recebam (via Realtime do passo 1).

3. **Sem mudanças no banco** — o valor já está correto.

## Detalhes técnicos

- `src/hooks/usePlatformContent.ts`: remover `CACHE_TTL` longo, refetch on mount + canal Realtime `platform_content` que zera `cache` e re-busca.
- Habilitar Realtime para `platform_content` se ainda não estiver (`ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_content`).

Após aplicar, basta fechar e reabrir o painel (ou esperar ~2s) que o link novo aparece sem precisar de hard-reload.