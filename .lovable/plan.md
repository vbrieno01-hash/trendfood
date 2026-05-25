# Diagnóstico

O log da edge function `uazapi-create-instance` mostra:

```
uazapi init error: 404 404 page not found
```

Ou seja: o QR não abre porque a chamada `POST {UAZAPI_SERVER_URL}/instance/init` está respondendo **404**. O frontend só recebe o erro e não tem QR para renderizar.

Causas possíveis (em ordem):

1. **`UAZAPI_SERVER_URL` aponta para um host errado** (ex.: um Evolution API na Oracle, que não tem a rota `/instance/init` do uazapi).
2. **`UAZAPI_SERVER_URL` tem path extra** (ex.: `https://x.com/api`) e a chamada vira `/api/instance/init` inexistente.
3. **Servidor uazapi correto, mas versão antiga** que usa outra rota (ex.: `/instance/create`).
4. **`UAZAPI_ADMIN_TOKEN` errado** — menos provável (uazapi normalmente devolve 401, não 404).

Hoje a tabela `whatsapp_instances` está **vazia** — nenhum lojista nunca conectou por esse caminho, então não dá pra inferir um valor que "já funciona".

# Plano

## 1. Melhorar diagnóstico em `uazapi-create-instance`

- Logar a URL final exata chamada (sem token), o status HTTP e o body devolvido.
- No retorno HTTP 502 atual, incluir também o `server_url` usado e o `path` tentado, para facilitar identificar configuração errada sem precisar abrir logs.
- Tentar **fallback de path** quando `/instance/init` der 404: tentar `/instance/create` (uazapi legacy) e logar qual funcionou. Se nenhum funcionar, devolver erro claro `"endpoint_not_found"` com os paths tentados.

## 2. Tela admin — mensagem de erro útil

- Em `AIBotAdminTab.tsx`, quando `uazapi-create-instance` falhar, exibir no toast a `detail` retornada pela função (status + path + body) ao invés de só "Falha ao conectar".
- Adicionar um pequeno painel "Diagnóstico do servidor uazapi" com:
  - URL atual do servidor (lida via nova edge function read-only `uazapi-server-info` que devolve só `{ server_url, has_admin_token }`, sem expor o token).
  - Botão "Testar servidor" que faz `GET {server}/` e mostra o status — confirma se a URL é alcançável antes de tentar criar instância.

## 3. Confirmar secrets com o usuário

Depois do deploy, pedir ao usuário para verificar/atualizar dois secrets em Lovable Cloud → Configurações → Secrets:

- `UAZAPI_SERVER_URL` — deve ser a raiz do servidor uazapi (ex.: `https://free.uazapi.com` **sem** `/api` no final).
- `UAZAPI_ADMIN_TOKEN` — admintoken válido do painel uazapi.

Sem isso correto, nenhuma instância (admin **ou** lojista) consegue ser criada.

# Arquivos a alterar

- `supabase/functions/uazapi-create-instance/index.ts` — logs detalhados + fallback `/instance/create`.
- `supabase/functions/uazapi-server-info/index.ts` — **novo**, leitura segura da URL configurada.
- `src/components/admin/AIBotAdminTab.tsx` — toast com detail, painel de diagnóstico, botão "Testar servidor".

Nenhuma migration nova, nenhuma mudança no schema.
