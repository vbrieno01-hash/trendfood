## Suporte por chat: lojista ↔ você (admin)

Hoje o botãozinho laranja abre um chat com IA. Vamos transformar em **suporte direto comigo (admin)**, 1 conversa por loja, com fotos e tempo real. A IA antiga é apagada.

### Horário de atendimento (só expectativa, nunca bloqueia)
- Horário oficial exibido: **08:00 às 22:00** (Brasília).
- **Lojista pode mandar mensagem a qualquer hora** — você responde quando puder, mesmo de madrugada.
- Dentro do horário: badge 🟢 "Online agora — costumo responder rápido".
- Fora do horário: badge 🟡 "Fora do horário (08h–22h). Pode mandar mesmo assim que respondo assim que vir." + texto sutil acima do input pra acalmar a expectativa.
- Objetivo: **evitar ansiedade e flood de madrugada**, sem travar nada.

### Lojista (botão flutuante)
- Mesmo botão de hoje, **só dentro do dashboard** (`/dashboard/*`). Some na vitrine, checkout e landing.
- Cada loja tem **uma conversa única** comigo — texto + foto.
- Badge vermelho + som leve quando admin responde.
- Indicador "lido / não lido" e horário ao lado de cada mensagem.

### Admin (você)
- Nova aba **"Suporte"** no painel admin:
  - Lista de conversas à esquerda (nome da loja, última mensagem, badge de não-lidas, ordenadas por atividade).
  - Painel de chat à direita: histórico + resposta + anexar foto.
  - Filtro: Não lidas / Todas / Resolvidas.
  - Botão "Marcar resolvida" (arquiva, histórico fica).
- Notificação no **Telegram admin** sempre que lojista mandar mensagem nova (incluindo madrugada — você que decide responder ou não).

### Storage de fotos
- Bucket `support-attachments` privado.
- Lojista só sobe/vê fotos da própria conversa; admin vê todas.
- URLs assinadas com expiração curta.

---

### Detalhes técnicos

**Migration nova:**
- `support_conversations(id, organization_id UNIQUE, last_message_at, unread_for_admin INT, unread_for_store INT, resolved_at, created_at)`.
- `support_messages(id, conversation_id, sender 'store'|'admin', sender_user_id, content TEXT, attachment_url TEXT, read_at, created_at)`.
- RLS:
  - Lojista: SELECT/INSERT só nas conversas da própria org (via `organizations.user_id = auth.uid()`).
  - Admin (`has_role(auth.uid(),'admin')`): SELECT/INSERT em tudo + UPDATE de `resolved_at`.
- Trigger `tg_support_msg_after_insert`:
  - Atualiza `last_message_at`.
  - Incrementa `unread_for_admin` se `sender='store'`, senão `unread_for_store`.
  - Se `sender='store'`: chama `notify_admin_telegram('support_new_message', {...})` — **sempre, independente do horário**.
- Realtime habilitado em `support_messages` e `support_conversations`.

**Storage:**
- Bucket `support-attachments` privado.
- Policies: INSERT/SELECT se o 1º segmento do path = `organization_id` do user OU se for admin.
- Estrutura: `{org_id}/{uuid}.{ext}`.

**Frontend:**
- Reescrever `src/components/SupportChatWidget.tsx`: remover SSE/IA, plugar em Supabase Realtime, esconder fora de `/dashboard`. Mostrar badge de horário (verde/amarelo) — **nunca desabilita o input**.
- Novo hook `src/hooks/useSupportChat.ts`: carrega/cria conversa, envia mensagem, upload de foto, marca como lida.
- Novo componente `src/components/admin/SupportInboxTab.tsx` + plugar em `AdminPage.tsx` como aba "Suporte".

**Limpeza (libera espaço):**
- Deletar pasta `supabase/functions/support-chat/` (era a IA).
- Chamar `delete_edge_functions(['support-chat'])` para remover do deploy.
- Limpar `LOVABLE_API_KEY` do código se não for usada em outro lugar.