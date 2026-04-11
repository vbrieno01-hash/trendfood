

## Separar fluxo "Esqueci minha senha" do formulário de login

### Problema
Quando o usuário clica em "Esqueci minha senha", o formulário de redefinição aparece **abaixo** do formulário de login, misturando dois fluxos na mesma tela e confundindo o usuário.

### Solução
Quando `forgotMode` estiver ativo, **esconder o formulário de login inteiro** e mostrar **apenas** o formulário de redefinição de senha, com um botão "Voltar ao login" para retornar.

### Alterações em `src/pages/AuthPage.tsx`

1. **Envolver o formulário de login** (campos email, senha, botão entrar, link esqueci senha) em uma condicional `{!forgotMode && (...)}` para que ele desapareça quando o modo de redefinição estiver ativo.

2. **Transformar o bloco de redefinição** (linhas 735-758) em uma tela independente — sem borda/card interno, ocupando o espaço principal com título "Redefinir senha", campo de e-mail e botões "Enviar link" / "Voltar ao login".

3. O botão "Voltar ao login" chama `setForgotMode(false)` para restaurar o formulário de login.

Resultado: telas mutuamente exclusivas — ou login, ou redefinição — sem mistura visual.

