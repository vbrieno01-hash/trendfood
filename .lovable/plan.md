

## Mensagem inicial automatica no chat de vendas

### Problema
Quando voce cria uma conversa nova, ela fica vazia. Voce nao sabe o que mandar pro cliente e precisa pensar na abertura. A IA deveria ja gerar a primeira mensagem pra voce copiar e mandar no WhatsApp.

### O que muda

**Arquivo:** `src/components/admin/SalesChatTab.tsx`

1. **Apos criar a conversa**, chamar automaticamente a IA pedindo pra gerar a mensagem de abertura
2. A IA vai responder com algo tipo "e ai, tudo certo?" ou "opa, blz?" (seguindo a regra 3 do prompt que ja existe)
3. Essa mensagem ja aparece no chat pronta pra voce copiar e colar no WhatsApp
4. Tambem adicionar **sugestoes rapidas** quando a conversa ta vazia, tipo botoes com:
   - "Gera a primeira mensagem pra eu mandar"
   - "Cliente respondeu 'oi, tudo bem'" 
   - "Cliente pediu o link"
   - "Cliente perguntou o preco"

### Fluxo novo
1. Voce clica "Nova Conversa" e preenche nome/whatsapp
2. A conversa é criada e a IA automaticamente gera a saudacao inicial
3. Voce copia a mensagem e manda no WhatsApp
4. Quando o cliente responder, voce cola a resposta dele e a IA gera a proxima mensagem

### Detalhe tecnico
- Na funcao `createConversation()`, apos inserir no banco, disparar automaticamente uma chamada pro `sales-chat` com uma mensagem de sistema tipo "gere a primeira mensagem de abertura para o cliente"
- Salvar a resposta como mensagem do assistant no banco
- Adicionar botoes de sugestao rapida no estado vazio da conversa

