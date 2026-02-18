
## MVP SaaS Multi-Tenant — Plataforma de Sugestões para Estabelecimentos

### Estrutura de Páginas

**1. Landing Page (`/`)**
- Hero section com título, subtítulo e chamada para ação
- Seção explicando como funciona (3 passos simples)
- Botão "Criar minha conta" em destaque
- Design clean com identidade visual moderna

**2. Página Pública do Estabelecimento (`/unidade/[slug]`)**
- Header com nome e logo do estabelecimento
- Formulário para sugerir novo lanche (nome + descrição)
- Lista de sugestões com botão de curtir (❤️)
- Cada sugestão mostra nome, descrição e contagem de votos
- Controle de voto via `localStorage` (1 voto por sugestão por dispositivo)
- Design mobile-first

**3. Dashboard do Lojista (`/unidade/[slug]/dashboard`)**
- Tela de login com senha simples (configurada por estabelecimento)
- Visualização das sugestões mais votadas em cards
- Filtro por status: **Pendente**, **Em Produção**, **Finalizado**
- Botão para alterar o status de cada sugestão
- Ordenação por número de votos

**4. Página 404** — redirecionamento para estabelecimento não encontrado

---

### Dados (Mock para MVP Visual)

Dados simulados em memória com estrutura pronta para Supabase:
- `organizations` → `id`, `slug`, `name`, `password`
- `suggestions` → `id`, `organization_id`, `name`, `description`, `votes`, `status`

Dois estabelecimentos de exemplo já configurados para demonstração.

---

### Design & Componentes

- **Shadcn/ui** para todos os componentes (Cards, Buttons, Badges, Tabs, Dialog, Input)
- Tema moderno com cores neutras e accent vibrante
- 100% responsivo, prioridade mobile
- Status com badges coloridos (amarelo → Pendente, azul → Em Produção, verde → Finalizado)
