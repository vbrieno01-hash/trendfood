

## Painel WhatsApp Bot no Admin

Adicionar uma nova aba/secao no painel Admin para monitorar e gerenciar o bot de WhatsApp automatico.

### O que sera criado

**1. Componente `WhatsAppBotTab.tsx`** (nova aba no Admin)

Exibe em tempo real todas as mensagens da tabela `fila_whatsapp`:
- Lista de conversas agrupadas por numero de telefone
- Cada conversa mostra: mensagem recebida, resposta da IA, status (pendente/respondido), horario
- Badge com contagem de mensagens pendentes
- Botao para testar o webhook com payload fake (simular mensagem chegando)
- Auto-refresh com realtime ou polling a cada 10s

**2. Integracao no AdminPage.tsx**

- Adicionar nova aba "WhatsApp Bot" no menu lateral do admin, com icone de MessageCircle
- Renderizar o componente `WhatsAppBotTab` quando a aba for selecionada

**3. Habilitar Realtime na tabela `fila_whatsapp`**

- Migration para adicionar `fila_whatsapp` ao `supabase_realtime` para atualizacao instantanea no painel

**4. Ajustar RLS para admin poder visualizar**

- Atualmente todas as policies sao `false` (so service_role acessa)
- Adicionar policy de SELECT para usuarios com role `admin` poderem visualizar as mensagens no painel

### Detalhes tecnicos

- O componente seguira o mesmo padrao visual do `SalesChatTab.tsx` (lista de conversas a esquerda, detalhes a direita)
- O botao "Testar" chamara o endpoint `whatsapp-webhook` com um payload fake no formato da Evolution API
- As mensagens pendentes terao indicador visual (badge amarelo), respondidas (badge verde)
- Agrupamento por telefone para simular threads de conversa

### Arquivos modificados
- `src/components/admin/WhatsAppBotTab.tsx` -- novo componente
- `src/pages/AdminPage.tsx` -- adicionar aba
- Migration SQL -- realtime + RLS policy de select para admin

### Proximo passo (apos este)
Criar o script Python `whatsapp_bot.py` que faz polling no `whatsapp-queue` e envia respostas via Evolution API -- igual ao `trendfood.py` da impressora.

