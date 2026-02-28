

# Plano: Criar tabela `whatsapp_instances`

## Migração SQL

Criar tabela `whatsapp_instances` vinculada a `organizations` (que representa cada loja), com RLS protegendo acesso ao dono da organização.

```sql
CREATE TABLE public.whatsapp_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  instance_name text NOT NULL,
  instance_token text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Somente o dono da loja pode ler, criar, editar e deletar
CREATE POLICY wi_select_owner ON public.whatsapp_instances FOR SELECT
  USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = organization_id));

CREATE POLICY wi_insert_owner ON public.whatsapp_instances FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM organizations WHERE id = organization_id));

CREATE POLICY wi_update_owner ON public.whatsapp_instances FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = organization_id));

CREATE POLICY wi_delete_owner ON public.whatsapp_instances FOR DELETE
  USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = organization_id));
```

## Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid PK | Identificador único |
| `organization_id` | uuid FK → organizations | Loja dona da instância |
| `instance_name` | text | Nome da instância na Evolution API |
| `instance_token` | text | Token de autenticação da instância |
| `status` | text | Estado da conexão (`disconnected`, `connected`, `qr_pending`) |
| `created_at` | timestamptz | Data de criação |

## Segurança

- RLS ativado — apenas o `user_id` dono da `organization` pode CRUD.
- `instance_token` nunca fica exposto publicamente.

## Nenhuma alteração de código nesta etapa

A tabela será criada apenas no banco. Integração com UI e edge functions pode ser feita em seguida.

