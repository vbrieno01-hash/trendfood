

## Plano: Redefinição de senha (Esqueci minha senha)

### Problema
Não existe nenhum fluxo de "Esqueci minha senha" no sistema. Se o dono da loja esquecer a senha, não tem como recuperar.

### O que será feito

**1. Link "Esqueci minha senha" na tela de login** (`src/pages/AuthPage.tsx`)
- Adicionar link abaixo do campo de senha na aba "Entrar"
- Ao clicar, exibe um mini-formulário pedindo o e-mail
- Chama `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/redefinir-senha' })`
- Mostra toast de sucesso: "Link de redefinição enviado para seu e-mail"

**2. Página `/redefinir-senha`** (`src/pages/ResetPasswordPage.tsx`)
- Rota pública que detecta o token de recovery na URL (hash `type=recovery`)
- Exibe formulário com "Nova senha" + "Confirmar nova senha"
- Chama `supabase.auth.updateUser({ password })` para salvar
- Após sucesso, redireciona para `/dashboard`

**3. Rota no App.tsx**
- Adicionar `<Route path="/redefinir-senha" element={<ResetPasswordPage />} />`

### Arquivos alterados
- `src/pages/AuthPage.tsx` — link + formulário de "esqueci minha senha"
- `src/pages/ResetPasswordPage.tsx` — nova página
- `src/App.tsx` — nova rota

