

# Limpar lojas de teste e corrigir dados

## O que aconteceu

A loja "bebidas" foi criada antes do fix de heranca de plano ser aplicado, entao ela ficou com `subscription_plan = 'free'` e `trial_ends_at` com 7 dias (defaults do banco). O codigo ja esta corrigido -- novas unidades criadas pelo dialog agora herdam o plano Enterprise automaticamente.

## Acoes necessarias

### 1. Atualizar a loja "bebidas" para Enterprise

Corrigir os dados da loja "bebidas" (pertence ao usuario vendass945@gmail.com, mesma conta do "Burguer do Rei"):

```text
UPDATE organizations 
SET subscription_plan = 'enterprise', trial_ends_at = NULL 
WHERE id = 'e75374b7-edab-4272-bee0-260458a989df'
```

Isso remove o banner de trial e desbloqueia todas as funcionalidades Enterprise.

### 2. Deletar lojas de teste

Remover as seguintes organizacoes de teste e todos os dados relacionados (menu_items, orders, tables, cash_sessions, cash_withdrawals, coupons, suggestions, organization_secrets):

| Loja | Email | Motivo |
|---|---|---|
| Loja Matriz | teste-multiunit@test.com | Conta de teste |
| Lanchonete Teste | testeflow2026@test.com | Conta de teste |
| Loja Parse Test | teste-endereco-parse@test.com | Conta de teste |
| Loja Teste CEP | teste-cep-flow@test.com | Conta de teste |
| Loja Trial Teste | testetrial7dias@teste.com | Conta de teste |
| Loja Onboarding Test | onboarding-test-tf@yopmail.com | Conta de teste |
| Lanche do Carlos Teste | carlos.teste.trendfood@mailinator.com | Conta de teste |
| Burguer Teste | teste@trendfood.com | Conta de teste |
| teste50 | teste50@gmail.com | Conta de teste |

A limpeza sera feita deletando primeiro os dados filhos (orders, menu_items, tables, etc.) e depois as organizations.

### 3. Lojas reais preservadas

Estas lojas NAO serao tocadas:

| Loja | Email | Plano |
|---|---|---|
| Burguer do Rei | vendass945@gmail.com | Enterprise |
| bebidas | vendass945@gmail.com | Enterprise (apos fix) |
| mlsviplanches | mlsmilionarios@gmail.com | Enterprise |
| Ph | ph8762841@gmail.com | Free |
| Jubileu story | bina.lopes0606@gmail.com | Free |
| Bobo | bobo@gmail.com | Free |
| brenotorado | pobrerico248@gmail.com | Free |

## Nenhuma mudanca de codigo

O fix de heranca de plano ja esta aplicado no `CreateUnitDialog.tsx`. Apenas dados no banco precisam ser corrigidos.
