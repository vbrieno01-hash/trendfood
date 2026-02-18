
## Correção das Políticas RLS — Cadastro ainda não funciona

### Diagnóstico confirmado

Analisando a migração existente (`20260218225538_*.sql`) e o estado atual do banco, confirmei que:

1. As políticas foram criadas **sem `AS PERMISSIVE`** — no Postgres, isso as torna RESTRICTIVE implicitamente quando combinadas, bloqueando todo acesso.
2. A migração corretiva ainda **não foi aplicada** — a aprovação não chegou na etapa anterior.
3. Auto-confirm também ainda não foi habilitado no auth.

O fluxo de cadastro continua falhando com: `new row violates row-level security policy for table "organizations"`

---

### O que precisa ser feito (uma única migração)

**Passo 1 — Dropar todas as políticas atuais** das tabelas `organizations` e `suggestions`

**Passo 2 — Recriar como PERMISSIVE** (com `AS PERMISSIVE` explícito):

Tabela `organizations`:
- `SELECT` público por slug: `USING (true)`
- `SELECT` restrito ao dono: `USING (auth.uid() = user_id)`
- `INSERT` somente pelo dono: `WITH CHECK (auth.uid() = user_id)`
- `UPDATE` somente pelo dono: `USING (auth.uid() = user_id)`

Tabela `suggestions`:
- `SELECT` público: `USING (true)`
- `INSERT` público: `WITH CHECK (true)` — visitantes podem sugerir sem conta
- `UPDATE` somente pelo dono da organização

**Passo 3 — Habilitar auto-confirm no Auth** para que o `signUp()` retorne uma sessão válida imediatamente, permitindo o INSERT subsequente na `organizations`.

---

### Por que isso resolve

Atualmente o fluxo quebra assim:

```text
signUp() → usuário criado, mas sem sessão (e-mail não confirmado)
INSERT organizations → auth.uid() = null → RLS bloqueia → ERRO 401
```

Após a correção:

```text
signUp() → usuário criado + sessão ativa imediata (auto-confirm)
INSERT organizations → auth.uid() disponível → RLS permite → SUCESSO
redirect /unidade/{slug}/dashboard → OK
```

---

### Arquivos alterados

- **Banco de dados**: nova migração SQL que recria as políticas como PERMISSIVE
- **Auth**: configurar auto-confirm para sessão imediata
- **Nenhum arquivo de frontend** precisa mudar
