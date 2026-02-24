

## Chat de Vendas com IA no Painel Admin

Criar um assistente de vendas inteligente dentro do painel administrativo que gera respostas profissionais e humanizadas para atrair leads e converter clientes para o TrendFood. O admin conversa com a IA, copia as respostas e envia para os potenciais clientes.

### Como vai funcionar

1. Nova aba "Vendas" no sidebar do admin com icone de mensagem
2. Painel lateral esquerdo com lista de conversas (Conversa 1, Conversa 2...) e botao para criar nova
3. Area principal de chat onde o admin digita o que o cliente falou e a IA responde como um estrategista de vendas profissional
4. Botao de copiar em cada resposta da IA para facilitar o envio ao cliente
5. Conversas salvas no banco de dados para consulta futura

### Personalidade da IA

- Profissional de estrategia comercial, nao robotizado
- Conhece todas as dores: taxas altas do iFood, falta de controle, perda de dados dos clientes
- Sempre oferece 7 dias gratis de teste
- Se o cliente nao gostar, pode ficar no plano gratuito
- Conduz a conversa do "oi" ate o fechamento (cadastro no site)
- Tom humano, empatetico e consultivo

### Detalhes tecnicos

**1. Banco de dados -- 2 novas tabelas**

- `sales_conversations`: id, admin_user_id, title, created_at, updated_at
- `sales_messages`: id, conversation_id, role (user/assistant), content, created_at

Ambas com RLS restrita ao admin (auth.uid() = admin_user_id).

**2. Edge function `sales-chat`**

- Recebe o historico da conversa e envia para o Lovable AI Gateway (google/gemini-3-flash-preview)
- System prompt robusto com todas as informacoes do TrendFood: dores, solucoes, diferenciais, precos, trial de 7 dias
- Streaming SSE para resposta em tempo real
- Usa LOVABLE_API_KEY (ja configurada)

**3. Novo componente `SalesChatTab.tsx`**

- Lista de conversas no lado esquerdo (mobile: drawer)
- Chat no lado direito com historico de mensagens
- Botao de copiar resposta em cada mensagem da IA
- Input para digitar o que o cliente falou
- Criar/renomear/excluir conversas

**4. Alteracoes em `AdminPage.tsx`**

- Adicionar "vendas" ao tipo AdminTab
- Adicionar item no sidebar com icone MessageCircle
- Renderizar SalesChatTab quando aba ativa for "vendas"

### Fluxo do admin

```text
Admin abre aba Vendas
  |
  +-- Cria "Conversa 1 - Joao"
  |
  +-- Digita: "O cliente disse: oi, voces vendem site pra restaurante?"
  |
  +-- IA responde como estrategista (tom humano)
  |
  +-- Admin clica "Copiar" e cola no WhatsApp do cliente
  |
  +-- Repete ate o fechamento
```

