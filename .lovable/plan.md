

## Adicionar contato do cliente nas conversas de vendas

Adicionar campos de contato (nome e WhatsApp) em cada conversa para que voce possa entrar em contato direto com os leads pelo WhatsApp.

### O que muda

1. Cada conversa tera campos opcionais de **nome do cliente** e **WhatsApp**
2. Um botao de WhatsApp aparece no header do chat para abrir conversa direto
3. Ao criar uma nova conversa, um mini formulario pede nome e WhatsApp (opcionais)
4. Na lista de conversas, aparece o nome do cliente abaixo do titulo

### Detalhes tecnicos

**1. Migracao no banco de dados**

Adicionar 2 colunas na tabela `sales_conversations`:
- `client_name` (text, nullable)
- `client_whatsapp` (text, nullable)

**2. Alteracoes em `SalesChatTab.tsx`**

- Atualizar interface `Conversation` com os novos campos
- Adicionar dialog/modal para criar conversa com campos: titulo, nome do cliente, WhatsApp
- No header do chat, mostrar botao de WhatsApp (abre `https://wa.me/55{numero}`) quando o WhatsApp estiver preenchido
- Na lista lateral, mostrar nome do cliente como subtitulo da conversa
- Permitir editar nome e WhatsApp do cliente no header

**3. Atualizar `types.ts`**

Sera atualizado automaticamente apos a migracao.

### Fluxo

```text
Admin clica "Nova Conversa"
  |
  +-- Modal pede: Titulo, Nome do cliente, WhatsApp (opcionais)
  |
  +-- Conversa criada com dados do lead
  |
  +-- No chat, botao WhatsApp no header abre wa.me direto
  |
  +-- Na lista lateral, mostra "Joao - (11) 99999..."
```

