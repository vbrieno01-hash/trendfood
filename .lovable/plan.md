

# Adicionar confirmacao de e-mail e senha no cadastro

## Resumo

Adicionar dois campos de confirmacao no formulario de cadastro da AuthPage: "Confirme seu e-mail" e "Confirme sua senha". A validacao impede o envio se os valores nao coincidirem.

## Mudancas

### Arquivo: `src/pages/AuthPage.tsx`

1. Adicionar dois novos campos ao estado `signupData`: `confirmEmail` e `confirmPassword`
2. Inserir o campo "Confirme seu e-mail" logo abaixo do campo "E-mail"
3. Inserir o campo "Confirme sua senha" logo abaixo do campo "Senha" (com toggle de visibilidade)
4. No `handleSignup`, antes de tudo, validar:
   - Se `email !== confirmEmail` -> toast.error("Os e-mails nao coincidem.")
   - Se `password !== confirmPassword` -> toast.error("As senhas nao coincidem.")
   - Retornar sem prosseguir caso falhe

Nenhuma outra pagina ou componente precisa ser alterado.
