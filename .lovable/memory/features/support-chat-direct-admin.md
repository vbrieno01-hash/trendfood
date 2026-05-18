---
name: support-chat-direct-admin
description: Floating widget é chat 1:1 entre lojista e admin (Breno), com fotos e tempo real. IA removida.
type: feature
---
- SupportChatWidget aparece só em rotas internas (/dashboard, /cozinha, /garcom, /admin, /motoboy) via ConditionalSupportChat em App.tsx.
- Cada loja tem 1 conversa única em `support_conversations` (UNIQUE organization_id). Mensagens em `support_messages` com sender ∈ {store, admin}.
- Trigger `tg_support_msg_after_insert` atualiza last_message_at/preview, incrementa contador do lado oposto e dispara `notify_admin_telegram('support_new_message', ...)` quando lojista escreve.
- RPC `support_get_or_create_conversation(_org_id)` e `support_mark_read(_conv_id, _as)`.
- Realtime habilitado em ambas as tabelas.
- Storage bucket privado `support-attachments`, path `{org_id}/{uuid}.{ext}`. RLS exige ownership da org OU admin.
- Horário oficial exibido: 08–22 BRT (badge verde/amarelo). NÃO bloqueia envio — admin sempre vê.
- Admin acessa via aba "Suporte (lojistas)" em AdminPage.
- Edge function antiga `support-chat` (IA) foi removida.
