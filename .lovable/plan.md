
A tela de webhook do uazapiGO que você mostrou pede dois campos importantes que precisamos preencher direitinho pra funcionar:

## Como configurar o Webhook no painel uazapiGO

**No modal "Webhooks" que tá aberto na tela:**

1. **Habilitado** → ligar o switch (canto superior direito)
2. **POST** → manter selecionado (já tá verde)
3. **URL** → colar:
   ```
   https://xrzudhylpphnzousilye.supabase.co/functions/v1/whatsapp-webhook
   ```
4. **addUrlEvents** → deixar **desligado** (não precisa, vamos filtrar no nosso código)
5. **addUrlTypesMessages** → deixar **desligado**
6. **Escutar eventos** → digitar exatamente:
   ```
   messages
   ```
   (só isso, em minúsculo — é o evento de mensagem recebida)
7. **Excluir dos eventos escutados** → digitar:
   ```
   wasSentByApi,isGroupYes
   ```
   (separados por vírgula — evita loop quando o próprio robô responde, e ignora mensagens de grupo)
8. Clicar em **Salvar** (botão azul)

## Por que esses filtros

- **`wasSentByApi`** — quando o robô manda uma resposta, o uazapi também dispara o webhook. Sem esse filtro o robô recebe a própria resposta como "nova mensagem" e responde a si mesmo num loop infinito.
- **`isGroupYes`** — ignora mensagens de grupos do WhatsApp (a gente só quer atender 1-a-1, não responder em grupo de família).

## O que melhorar no nosso lado pra ficar mais resiliente

Vou fazer 3 ajustes pequenos no código pra garantir que mesmo se o uazapiGO mandar evento esquisito, nada quebra:

1. **Edge function `whatsapp-webhook`**: adicionar guardas extras
   - Ignorar payloads onde `fromMe = true` (defesa em profundidade — caso o filtro lá no uazapi falhe)
   - Ignorar mensagens de grupos (`@g.us` no remote ID)
   - Logar payload bruto recebido pra eu te ajudar a debugar nos logs caso algo não funcione

2. **Painel admin (`AIBotAdminTab.tsx`)**: adicionar uma mini-seção de "Como configurar o webhook no uazapiGO" com esse passo-a-passo dentro do card "Conexão WhatsApp", incluindo os textos exatos pra colar (URL, "messages", "wasSentByApi,isGroupYes") com botões de copiar.

3. **Botão "Testar conexão"** no painel admin: faz um GET em `{server_url}/instance/status` com o token configurado e mostra ✅ verde se a instância tá conectada ao WhatsApp ou ❌ vermelho com a mensagem de erro. Assim você sabe na hora se o token tá certo antes de salvar.

### Arquivos a editar
- `supabase/functions/whatsapp-webhook/index.ts` — guardas extras + log do payload bruto
- `src/components/admin/AIBotAdminTab.tsx` — instruções passo-a-passo do webhook + botão testar conexão

Lojistas continuam com "EM BREVE" — nada muda pra eles.
