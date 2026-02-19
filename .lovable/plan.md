
# Corrigir Duplicacao de CEP e Dados Nao Salvos no Cadastro

## Problema

Dois bugs relacionados ao fluxo de criacao de conta:

1. **CEP pedido duas vezes**: O formulario de signup (AuthPage) coleta endereco/CEP. Apos o cadastro, o usuario vai para o Dashboard onde o OnboardingWizard abre automaticamente (porque `onboarding_done = false`) e pede o endereco/CEP novamente no passo 2.

2. **Dados nao salvos no perfil da loja**: O signup salva `store_address` e `whatsapp` corretamente na organizacao, mas o OnboardingWizard nao le esses dados existentes. Se o usuario passa pelo wizard sem preencher novamente, o passo 2 sobrescreve o endereco com `null`.

## Solucao

Remover os campos de endereco do formulario de signup e deixar essa responsabilidade exclusivamente para o OnboardingWizard, que ja foi projetado para isso. Isso elimina a duplicacao e simplifica o cadastro.

### Alteracoes

**1. AuthPage.tsx - Remover secao de endereco do signup**
- Remover o estado `addressFields` e `cepFetching`
- Remover a funcao `fetchCep`
- Remover toda a secao "Endereco da loja" do formulario
- Remover a interface `AddressFields` local e a funcao `buildStoreAddress` duplicada
- Remover a linha que salva `store_address` no insert da organizacao (o OnboardingWizard cuidara disso)

**2. OnboardingWizard.tsx - Pre-popular campos com dados existentes**
- Ao iniciar, ler `organization.store_address` e fazer parse com `parseStoreAddress` para pre-popular os campos de endereco (CEP, rua, numero, etc.)
- Assim, se o usuario ja tiver um endereco salvo (de qualquer fonte), o wizard mostra os dados preenchidos

### Resultado esperado

- O formulario de signup fica mais curto e rapido (sem endereco)
- O OnboardingWizard e o unico lugar que coleta endereco
- Se por algum motivo o endereco ja existir, o wizard mostra os dados pre-preenchidos
- Nenhum dado e sobrescrito com `null` acidentalmente

### Arquivos afetados

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/AuthPage.tsx` | Remove campos de endereco, interface AddressFields local e funcao buildStoreAddress duplicada |
| `src/components/dashboard/OnboardingWizard.tsx` | Pre-popula campos de endereco a partir de `organization.store_address` usando `parseStoreAddress` |

Nenhuma alteracao de banco de dados necessaria.
