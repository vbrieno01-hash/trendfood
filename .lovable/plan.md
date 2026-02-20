
# Traduzir mensagens de erro do backend para português

## Problema encontrado

As validacoes customizadas (e-mails e senhas nao coincidem) ja estao em portugues e funcionando corretamente. Porem, erros retornados pelo backend de autenticacao chegam em **ingles** e sao exibidos diretamente ao usuario. Exemplos:

- "Invalid login credentials" (login com senha errada)
- "User already registered" (e-mail ja cadastrado)
- "Password should be at least 6 characters" (senha curta)
- "Unable to validate email address: invalid format" (e-mail invalido)

## Solucao

### Arquivo: `src/pages/AuthPage.tsx`

Criar uma funcao `translateAuthError(message: string): string` que mapeia as mensagens mais comuns do backend para portugues:

```text
"Invalid login credentials"          -> "E-mail ou senha incorretos."
"User already registered"            -> "Este e-mail já está cadastrado."
"Password should be at least 6 characters" -> "A senha deve ter no mínimo 6 caracteres."
"Unable to validate email address: invalid format" -> "Formato de e-mail inválido."
"Email rate limit exceeded"          -> "Muitas tentativas. Aguarde alguns minutos."
"Signup requires a valid password"   -> "Informe uma senha válida."
(qualquer outra mensagem)            -> manter o fallback atual em portugues
```

Usar essa funcao nos dois catches:
- No `handleSignup` (linha 112): `toast.error(translateAuthError(error.message) ?? "Erro ao criar conta.")`
- No `handleLogin` (linha 143): `toast.error(translateAuthError(error.message) ?? "E-mail ou senha incorretos.")`

Nenhum outro arquivo precisa ser alterado.
