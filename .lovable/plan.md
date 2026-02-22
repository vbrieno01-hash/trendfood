

# Corrigir Duplicatas e Melhorar Autenticacao

## Problema Encontrado

- **Auth (usuarios)**: Sem duplicatas no momento. O Supabase ja impede emails duplicados nativamente, mas o codigo nao trata o erro de forma amigavel.
- **Motoboys (couriers)**: 3 registros duplicados para o mesmo telefone `(83) 99824-4382`. O formulario de cadastro nao verifica se o telefone/placa ja existe antes de inserir.

## Alteracoes Planejadas

### 1. Banco de Dados

**1.1 Constraint de unicidade na tabela `couriers`**
- Adicionar constraint UNIQUE em `(organization_id, phone)` para impedir duplicatas a nivel de banco
- Isso garante que um mesmo telefone nao pode ser cadastrado duas vezes na mesma organizacao

**1.2 Limpeza dos duplicados existentes**
- Remover os 2 registros duplicados, mantendo apenas o mais recente (id `6d81ebe7`)
- Atualizar entregas vinculadas aos IDs antigos para o ID correto

### 2. Cadastro do Motoboy (`useCourier.ts` - `useRegisterCourier`)

- Antes de inserir, consultar se ja existe um courier com o mesmo `phone` na `organization_id`
- Se existir: salvar o ID no localStorage e retornar o courier existente (comportamento de "login")
- Se nao existir: criar normalmente
- Exibir mensagem diferente: "Bem-vindo de volta!" vs "Cadastro realizado!"

### 3. Pagina do Motoboy (`CourierPage.tsx`)

- Ajustar o `handleRegister` para tratar o retorno do upsert
- Mostrar toast adequado conforme o courier seja novo ou existente

### 4. Tela de Auth do Lojista (`AuthPage.tsx`)

- No `handleSignup`, tratar o erro `User already registered` de forma mais clara
- Sugerir ao usuario que use a aba "Entrar" caso o email ja esteja cadastrado
- O Supabase Auth ja impede duplicatas nativamente (retorna erro 422), entao o foco e na mensagem

### 5. Redirecionamento pos-login

- O redirecionamento ja funciona corretamente:
  - Admin vai para `/admin`
  - Lojista vai para `/dashboard`
  - Motoboy usa o painel publico `/motoboy` (sem auth, baseado em localStorage)
- Nenhuma alteracao necessaria aqui

## Resumo dos arquivos

| Arquivo | Alteracao |
|---------|-----------|
| Migracao SQL | Limpar duplicados + adicionar UNIQUE constraint |
| `src/hooks/useCourier.ts` | Logica de upsert no `useRegisterCourier` |
| `src/pages/CourierPage.tsx` | Toast diferenciado para login vs cadastro |
| `src/pages/AuthPage.tsx` | Melhorar mensagem de erro para email ja existente |

## Detalhes tecnicos

- A constraint UNIQUE sera `UNIQUE(organization_id, phone)` para permitir que o mesmo motoboy atue em organizacoes diferentes
- A limpeza sera feita via INSERT tool (operacao de dados, nao schema)
- O upsert no frontend fara um SELECT antes do INSERT para decidir o fluxo
