## Diagnóstico

O alerta "Robô não vai responder ainda — falta salvar URL + token" aparece porque no banco `ai_bot_config` (linha global) os campos `test_instance_name` e `test_instance_token` continuam **nulos**:

```
test_instance_name | test_instance_token
       (vazio)     |      (vazio)
```

Ou seja, você configurou o webhook no painel uazapi e até conseguiu conectar, mas **não chegou a clicar em "Salvar credenciais"** no painel admin (ou clicou sem preencher os dois campos). O painel só considera o sandbox pronto quando algum dos dois (`token` ou `nome da instância`) está persistido no banco.

A migration, os tipos, e o branch sandbox da edge function `whatsapp-webhook` estão corretos. O problema é só de UX: hoje é manual demais.

## Plano

Deixar o sandbox "se auto-configurar" assim que a primeira mensagem chega no webhook — exatamente o comportamento que você esperava.

### 1. Edge function `whatsapp-webhook` — auto-aprendizado

Antes do branch 0 (sandbox) atual:

- Ler `ai_bot_config` global (uma vez, já é feito).
- Se a linha tem `test_org_id` preenchido **mas** `test_instance_name` e `test_instance_token` ainda estão nulos → tratar a primeira chamada como "pareamento":
  - Pegar `instanceName` (ou `instance`) e `token` do payload da uazapi.
  - Fazer `update ai_bot_config set test_instance_name=..., test_instance_token=... where id=<global>` usando a service role key (a function já roda com `verify_jwt=false` e tem acesso ao service role).
  - Continuar o fluxo normal de resposta (chamar `ai-bot-respond` com `test_org_id`).
- Se já tem credencial salva e ela bate → fluxo sandbox atual.
- Se já tem credencial salva e **não** bate (mensagem veio de outra instância) → segue para o match de `whatsapp_instances` por loja (fluxo Lucas atual).

Nenhuma alteração no fluxo das lojas reais. Nada toca `whatsapp_instances`.

### 2. Painel admin (`AIBotAdminTab.tsx`) — UX

- Mostrar o estado de "aguardando primeiro evento" quando `test_org_id` está preenchido mas ainda sem `test_instance_name`/`test_instance_token`:
  > "Sandbox armado. Mande a 1ª mensagem pra esse número — vou capturar o token automaticamente."
- Quando a credencial aparecer (via realtime em `ai_bot_config`), o card vira verde sozinho.
- Os campos manuais (URL/token/nome) continuam existindo como fallback, mas saem de "obrigatório" para "opcional / avançado".
- Botão "Salvar credenciais" continua funcionando igual, pra quem quiser preencher na mão.
- A regra `missing.push("salvar URL + token da instância acima")` vira `"mandar a 1ª mensagem pro número conectado (ou preencher token manualmente)"`.

### 3. Realtime no painel

Adicionar um channel em `ai_bot_config` filtrado por `id=eq.<global>` pra que, quando a edge function gravar o token, o painel atualize sem refresh.

## O que não muda

- `verify_jwt = false` na `whatsapp-webhook` (já está assim).
- Nenhuma loja real é tocada.
- `ai-bot-respond` continua igual (já aceita `server_url` override).
- Migrations já aplicadas seguem como estão — sem nova migration.

## Arquivos afetados

- `supabase/functions/whatsapp-webhook/index.ts` — auto-learn na primeira mensagem
- `src/components/admin/AIBotAdminTab.tsx` — textos, status "aguardando", realtime em ai_bot_config

Posso implementar?
