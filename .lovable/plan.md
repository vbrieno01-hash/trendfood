

## Registrar log de transferência no activation_logs

### O que será feito
Atualizar a edge function `transfer-org-owner` para, após transferir a loja com sucesso, inserir um registro na tabela `activation_logs` com os emails antigo e novo. Isso permite rastrear todas as transferências.

### Alteração na Edge Function

Antes do UPDATE na org, buscar o email do dono atual. Após o UPDATE bem-sucedido, inserir um log:

```typescript
// Buscar email do dono atual
const currentOwner = users?.find(u => u.id === org.user_id);
const oldEmail = currentOwner?.email ?? 'desconhecido';

// Após transferência bem-sucedida:
await adminClient.from("activation_logs").insert({
  organization_id,
  org_name: org.name,
  old_plan: null,
  new_plan: null,
  old_status: oldEmail,
  new_status: targetUser.email,
  source: 'transfer',
  admin_email: user.email,
  notes: `Transferência de propriedade: ${oldEmail} → ${targetUser.email}`
});
```

### Campos utilizados no activation_logs
- `old_status` → email antigo do dono
- `new_status` → email novo do dono  
- `source` → `'transfer'` (para filtrar facilmente)
- `notes` → descrição legível da transferência
- `admin_email` → email do admin que executou
- `org_name` → nome da loja

### Resumo
- 1 arquivo alterado: `supabase/functions/transfer-org-owner/index.ts`
- Nenhuma migração necessária (tabela `activation_logs` já existe com os campos necessários)
- Também será necessário buscar os dados da org (nome, user_id atual) antes do UPDATE

