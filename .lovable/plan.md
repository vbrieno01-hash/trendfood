## Problema

No cadastro/login, quando o Supabase retorna erro, a mensagem aparece **em inglês** (ex: "User already registered", "Password should be at least 6 characters"). O lojista não entende, fecha a tela e pode nunca mais voltar.

A função `translateAuthError` em `src/pages/AuthPage.tsx` (linhas 18-29) só cobre 6 mensagens e exige **match exato** — qualquer variação cai no `error.message` cru em inglês.

## Solução

Reescrever `translateAuthError` para **sempre devolver uma mensagem clara em português explicando o problema real e o que fazer**. Nunca usar fallback genérico — se nenhum padrão bater, mostrar mensagem que ainda orienta ("Verifique os dados e tente novamente. Se persistir, fale com o suporte.").

### Mensagens cobertas (matching por trecho, case-insensitive)

| Erro Supabase | Mensagem em PT |
|---|---|
| `User already registered` / `already been registered` | "Este e-mail já está cadastrado. Vá em **Entrar** e use sua senha, ou clique em **Esqueci minha senha**." |
| `Invalid login credentials` | "E-mail ou senha incorretos. Confira ou clique em **Esqueci minha senha**." |
| `Email not confirmed` | "Você ainda não confirmou seu e-mail. Abra a caixa de entrada (e o spam) e clique no link de confirmação." |
| `Password should be at least N characters` | "Senha muito curta. Use pelo menos **N caracteres**." (extrai o N do texto) |
| `weak_password` / `Password is known to be weak` / `pwned` | "Essa senha é fraca ou já vazou na internet. Use uma senha mais forte (letras, números e símbolos)." |
| `Unable to validate email address` / `invalid format` | "E-mail inválido. Confira se digitou certo (ex: nome@dominio.com)." |
| `Email rate limit exceeded` / `over_email_send_rate_limit` | "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo." |
| `For security purposes, you can only request this after X seconds` | "Por segurança, aguarde **X segundos** antes de tentar de novo." (extrai X) |
| `Signup is disabled` / `signups not allowed` | "Cadastro temporariamente indisponível. Tente em alguns minutos." |
| `Anonymous sign-ins are disabled` | "Cadastro anônimo desativado. Use seu e-mail e senha." |
| `Database error saving new user` / `unexpected_failure` | "Erro ao salvar sua conta. Tente novamente em alguns segundos — se continuar, fale com o suporte." |
| `Token has expired or is invalid` | "Link expirado. Peça um novo link para continuar." |
| `New password should be different` | "A nova senha precisa ser diferente da anterior." |
| `Failed to fetch` / `NetworkError` | "Sem conexão com a internet. Verifique sua rede e tente de novo." |
| Qualquer outro | "Não foi possível concluir. Verifique os dados e tente novamente. Se persistir, fale com o suporte." |

### Onde aplica

- `src/pages/AuthPage.tsx` linhas **404** (criar conta) e **439** (login) — `translateAuthError` passa a sempre retornar string em PT (nunca `undefined`), então remover o `?? error.message ?? "..."` redundante.

### Toast longo

Como algumas mensagens são mais longas (com instrução), aumentar `duration` do toast pra 7s nesses dois casos via `toast.error(msg, { duration: 7000 })`, pra dar tempo de ler.

## Arquivos

- `src/pages/AuthPage.tsx` — substituir função `translateAuthError` (linhas 18-29) e ajustar os 2 call-sites (linhas 404 e 439).

Sem migrations, sem mudança de UI, sem outros fluxos afetados.
