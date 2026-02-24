

## Remover aba "WhatsApp Bot" do painel Admin

### O que sera feito

Remover completamente a aba "WhatsApp Bot" do painel administrativo, incluindo:

### Arquivos alterados

**1. `src/pages/AdminPage.tsx`**
- Remover o import do `WhatsAppBotTab`
- Remover `"whatsapp"` do tipo `AdminTab`
- Remover o item `{ key: "whatsapp", ... }` do array de abas do sidebar
- Remover o bloco `{activeTab === "whatsapp" && <WhatsAppBotTab />}`

**2. `src/components/admin/WhatsAppBotTab.tsx`**
- Deletar o arquivo inteiro, pois nao sera mais utilizado

### O que NAO sera alterado
- A tabela `fila_whatsapp` no banco permanece (usada pelo webhook)
- As edge functions `whatsapp-webhook` e `whatsapp-queue` permanecem
- Todas as referencias a "whatsapp" em outras paginas (campo de telefone no cadastro, link no dashboard, etc.) permanecem intactas

