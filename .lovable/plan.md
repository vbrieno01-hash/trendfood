## Objetivo

Você quer manter o controle **loja-a-loja** pelo admin (nada de ligar em massa) e resolver o erro `405 Method Not Allowed` que aparece quando o robô tenta enviar.

## Parte 1 — Nada muda no banco (respeitar sua escolha)

Não vou tocar em `whatsapp_bot_allowed` de nenhuma loja. O comportamento atual já é exatamente o que você descreveu:

- Loja com toggle **desligado** → trigger sai no portão 1, nenhuma fila é criada, ninguém recebe nada automaticamente (fica "manual como antes").
- Loja com toggle **ligado** → mensagens de status enfileiram e são disparadas.

O que fica só para você saber:

- Onde ligar: **Admin → Gerenciamento de Lojas → botão do WhatsApp em cada loja** (toggle `whatsapp_bot_allowed`).
- Hoje só a **GBflix** está ligada. Rei do Burguer, WrBurg e demais ficam em manual até você ligar cada uma.

## Parte 2 — Corrigir o erro 405 (endpoint UazAPI errado)

Temos 3 edge functions que falam com o UazAPI e elas estão divergindo:

| Função | Endpoint atual |
|---|---|
| `uazapi-notify-owner` | `POST /message/text` |
| `uazapi-notify-customer` | `POST /message/text` |
| `whatsapp-outbox-dispatch` | `POST /send/text` |

O log mostra que uma delas retornou 405 no seu servidor `trendfood.uazapi.com`, ou seja, o servidor não aceita um dos dois caminhos. Preciso descobrir qual é o correto **antes** de mexer no código.

### Etapa 2.1 — Descoberta (só leitura, sem alterar código)

Após você aprovar este plano, na fase de execução vou disparar um `curl` de teste para os dois endpoints usando o token real da instância GBflix, e observar a resposta:

```text
POST https://trendfood.uazapi.com/send/text     → status ?
POST https://trendfood.uazapi.com/message/text  → status ?
```

Sem enviar mensagem real — payload com número inválido só para ler a resposta do servidor (200/400 = endpoint válido; 404/405 = endpoint errado).

### Etapa 2.2 — Padronização

Com base no resultado, edito **as 3 edge functions** para usar o mesmo caminho válido e faço redeploy. Nada mais além disso.

## Parte 3 — Pequeno ajuste de observabilidade (opcional)

Hoje `whatsapp_notification_log` só recebe linhas quando o trigger passa do portão 1 (loja liberada). Isso te esconde que Rei do Burguer e WrBurg *nunca* tentaram enviar. Se quiser, adiciono um log leve `status='disabled'` também quando a loja está sem toggle — assim você vê no painel quantas mensagens *deixaram* de ir por escolha sua.

Marque isto se quiser incluir; se não, ignoro.

## Fora de escopo

- Alterar `whatsapp_bot_allowed` em massa (você já disse não).
- Mudar planos, gates de trial, ou lógica de dedupe.
- UI nova.

## O que fica pronto ao final

- 3 edge functions apontando para o endpoint UazAPI correto e comprovadamente respondendo 200.
- Zero mudança de dados; controle continua 100% manual pelo admin.
- (Opcional) log de `disabled` para você auditar o silêncio das lojas sem robô.
