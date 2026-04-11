

## Remover campo WhatsApp do cadastro

### Problema
O usuário precisa informar o WhatsApp duas vezes — no cadastro e depois dentro do painel — causando frustração.

### Alterações em `src/pages/AuthPage.tsx`

1. **Remover o bloco HTML do campo WhatsApp** (linhas 660-681) do formulário de signup
2. **Remover a validação de WhatsApp** no `handleSignup` (linhas 229-232 que checam `whatsappDigits.length < 10`)
3. **Manter `whatsapp: null`** nas inserções da organização (linhas 285 e 329) — já que o campo não será mais preenchido no cadastro, passar `null` diretamente
4. **Limpar o estado** — remover `whatsapp` do `signupData` inicial (ou deixar vazio, já que não será usado)

O WhatsApp continuará sendo solicitado dentro do painel (onboarding/perfil da loja), onde já existe essa funcionalidade.

