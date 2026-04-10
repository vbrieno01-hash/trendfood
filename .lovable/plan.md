

## Adicionar "Transferir Loja" no Painel Admin

### O que será feito
Adicionar um botão "Transferir" no card de cada loja no painel admin que permite trocar o email dono da organização. O admin digita o novo email, o sistema busca o user_id correspondente na tabela `auth.users` (via edge function, já que o frontend não acessa `auth.users`), e faz o UPDATE no `user_id` da organização.

### Componentes

1. **Edge Function `transfer-org-owner`**
   - Recebe `{ organization_id, new_email }` 
   - Valida que o caller é admin (via JWT + `has_role`)
   - Busca o user_id do novo email em `auth.users` usando service role
   - Se o email não tiver conta, retorna erro claro
   - Faz `UPDATE organizations SET user_id = novo_user_id WHERE id = org_id`
   - Retorna sucesso com o novo email

2. **Componente `TransferOwnerDialog`** (`src/components/admin/TransferOwnerDialog.tsx`)
   - Dialog com input de email
   - Confirmação antes de executar ("Tem certeza que deseja transferir X para email@...")
   - Chama a edge function e mostra toast de sucesso/erro

3. **Integrar no card da loja** (`AdminPage.tsx`)
   - Adicionar botão "Transferir" ao lado do botão de excluir, na área de ações do card

### Fluxo
```text
Admin clica "Transferir" → Dialog abre → Digita novo email → Confirma
→ Edge function busca user_id do email → UPDATE organizations → Toast de sucesso
```

### Segurança
- Edge function valida role admin via service role key
- Nenhuma alteração em RLS necessária (admin já pode fazer UPDATE em organizations)

