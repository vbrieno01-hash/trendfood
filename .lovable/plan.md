
## Diagnóstico e Correção do Fluxo de Cadastro

### O que foi identificado

O teste revelou 2 problemas sobrepostos:

**Problema 1 — RLS bloqueando o INSERT na tabela `organizations` (erro 401)**

Após o `signUp()`, a autenticação retornou status 200 e criou o usuário. Porém, como o e-mail ainda não foi confirmado, o Supabase Auth **não emite uma sessão válida** nesse momento. Quando a próxima linha do código tenta inserir na tabela `organizations`, o token enviado é o token anônimo (sem `auth.uid()`), e a política RLS (`auth.uid() = user_id`) falha.

Mensagem de erro real: `"new row violates row-level security policy for table organizations"`

**Problema 2 — Políticas RLS criadas como RESTRICTIVE em vez de PERMISSIVE**

Ao revisar o schema, todas as políticas foram criadas com `Permissive: No` (ou seja, RESTRICTIVE). Políticas RESTRICTIVE só servem para restringir o que políticas PERMISSIVE já permitem — se não há nenhuma PERMISSIVE, **nada passa nunca**. Precisam ser recriadas como PERMISSIVE.

---

### Solução

**Parte 1 — Habilitar confirmação automática de e-mail (Auto-confirm)**

Para um app de food service como o TrendFood, exigir confirmação de e-mail antes do primeiro acesso cria uma fricção desnecessária. A solução correta é habilitar `auto-confirm` na configuração de autenticação. Com isso:

- O `signUp()` passa a retornar uma **sessão válida imediatamente**
- `auth.uid()` estará disponível na requisição seguinte
- O INSERT na `organizations` será autorizado pela RLS

**Parte 2 — Recriar as políticas RLS como PERMISSIVE**

A migração vai:
1. Remover todas as políticas RESTRICTIVE atuais das tabelas `organizations` e `suggestions`
2. Recriar todas como **PERMISSIVE** (comportamento padrão e correto)

Políticas para `organizations`:
- SELECT público por slug (qualquer um pode ver a página de uma lanchonete)
- SELECT restrito ao dono (para o dashboard)
- INSERT somente se `auth.uid() = user_id`
- UPDATE somente pelo dono

Políticas para `suggestions`:
- SELECT público (qualquer um pode ver as sugestões)
- INSERT público (qualquer visitante pode sugerir)
- UPDATE somente pelo dono da organização

---

### Arquivos Modificados

- **Banco de dados** (via migração): recriar políticas RLS como PERMISSIVE
- **Configuração de autenticação**: habilitar `auto-confirm email`
- Nenhum arquivo de código do frontend precisa ser alterado — o problema é 100% no backend

---

### Resultado Esperado Após a Correção

```text
[Usuário preenche formulário]
        ↓
[supabase.auth.signUp()] → 200 OK + sessão ativa imediata
        ↓
[INSERT organizations] → 201 Created (auth.uid() disponível)
        ↓
[Toast de sucesso]
        ↓
[Redirect → /unidade/{slug}/dashboard]
```
