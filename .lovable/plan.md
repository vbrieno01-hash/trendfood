
## Página de Cadastro de Estabelecimento — TrendFood

### Visão Geral

Será criada uma nova página `/cadastro` com formulário de registro de lojista, integrada ao Supabase para autenticação e persistência de dados. O botão "Criar minha conta grátis" da landing page e da seção CTA serão conectados a essa rota.

---

### Pré-requisito: Conexão com Supabase

O projeto ainda usa dados mock locais. Para implementar Auth + banco de dados real, precisaremos conectar ao **Supabase (Lovable Cloud)**. Isso envolve:

1. Criar as tabelas `organizations` e `suggestions` no Supabase
2. Configurar Row Level Security (RLS)
3. Usar o cliente Supabase no frontend

---

### Estrutura do Formulário de Cadastro (`/cadastro`)

Campos:
- **Nome Completo** — nome do lojista (salvo no perfil)
- **E-mail** — usado para login via Supabase Auth
- **Senha** — mínimo 6 caracteres
- **Nome da Lanchonete** — ex: "Burguer do Zé"
- **Slug desejado** — ex: `burguer-do-ze` (usado em `/unidade/burguer-do-ze`)

Validações (com Zod):
- E-mail válido
- Senha com no mínimo 6 caracteres
- Slug: apenas letras minúsculas, números e hífens (sem espaços ou acentos)
- Todos os campos obrigatórios

---

### Fluxo de Cadastro

```text
[Formulário preenchido]
        ↓
[Validação Zod no frontend]
        ↓
[supabase.auth.signUp(email, senha)]
        ↓ sucesso
[INSERT na tabela organizations { user_id, slug, name }]
        ↓ sucesso
[Toast: "Estabelecimento criado com sucesso! 🎉"]
        ↓
[navigate("/unidade/{slug}/dashboard")]
```

---

### Arquivos Criados / Modificados

**Novos:**
- `src/pages/SignUpPage.tsx` — página de cadastro com formulário completo
- `src/integrations/supabase/` — cliente Supabase (gerado automaticamente ao conectar)

**Modificados:**
- `src/App.tsx` — adicionar rota `/cadastro`
- `src/pages/Index.tsx` — conectar os dois botões "Criar minha conta grátis" para `to="/cadastro"` (em vez de `#demo`)
- `src/data/mockData.ts` — manter como fallback, mas o sistema passará a usar Supabase
- `src/pages/DashboardPage.tsx` — ajustar para buscar dados do Supabase pelo slug

---

### Design da Página de Cadastro

- Layout centralizado, coluna única, max-width 420px
- Card branco com sombra sutil (padrão do projeto)
- Logo TrendFood no topo
- Link para login caso já tenha conta
- Botão "Criar conta" com estado de loading (spinner + texto "Criando...")
- Toast de sucesso (verde) e erro (vermelho) via Sonner
- Helper text abaixo do campo Slug mostrando a URL gerada em tempo real: `/unidade/meu-slug`

---

### Banco de Dados Supabase

Tabela `organizations`:
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | Gerado automaticamente |
| user_id | uuid (FK → auth.users) | Dono do estabelecimento |
| slug | text (UNIQUE) | URL do estabelecimento |
| name | text | Nome da lanchonete |
| description | text | Descrição (opcional) |
| emoji | text | Emoji padrão 🍽️ |
| created_at | timestamptz | Data de criação |

Tabela `suggestions`:
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | Gerado automaticamente |
| organization_id | uuid (FK → organizations) | Pertence a qual org |
| name | text | Nome da sugestão |
| description | text | Descrição |
| votes | integer | Contagem de votos |
| status | text | pending/in_production/finished |
| created_at | timestamptz | Data |

RLS configurado para que cada lojista acesse apenas sua própria `organization`.

---

### Nota Técnica

Ao aprovar este plano, o assistente irá primeiramente solicitar a conexão com o **Supabase/Lovable Cloud** antes de escrever o código, pois sem o backend não é possível implementar autenticação real.
