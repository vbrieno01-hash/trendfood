

# Correção: Dados do Perfil da Loja sumindo ao trocar de aba

## O que aconteceu?

Voce NAO quebrou o projeto. O problema e simples: a query que carrega os dados da sua loja no login nao inclui todos os campos necessarios. Quando voce troca de aba e volta, o formulario e recriado usando esses dados incompletos, e tudo aparece vazio.

## Causa raiz

No arquivo `useAuth.tsx`, a query SELECT busca:
```
id, name, slug, description, emoji, primary_color, logo_url, user_id, created_at, whatsapp, subscription_status, subscription_plan, onboarding_done, trial_ends_at, pix_key, paused, business_hours
```

Faltam 3 campos que o formulario do Perfil da Loja usa:
- `store_address` (endereco da loja)
- `delivery_config` (configuracao de frete)
- `pix_confirmation_mode` (modo de confirmacao PIX)

## Solucao

Adicionar os 3 campos ausentes na query do `useAuth.tsx` e na interface `Organization` do mesmo arquivo.

## Detalhes tecnicos

**Arquivo:** `src/hooks/useAuth.tsx`

1. Adicionar na interface `Organization`:
   - `store_address?: string | null`
   - `delivery_config?: any`
   - `pix_confirmation_mode?: string`

2. Atualizar a query `.select()` na funcao `fetchOrganization` para incluir:
   ```
   store_address, delivery_config, pix_confirmation_mode
   ```

Nenhuma alteracao no banco de dados e necessaria — os campos ja existem na tabela `organizations`.
