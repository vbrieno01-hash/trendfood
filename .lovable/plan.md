

# Busca automatica de CEP (sem botao "Buscar")

## O que sera feito

Remover o botao "Buscar" de todos os campos de CEP do sistema e fazer a busca automatica quando o usuario digitar 8 digitos. Isso sera aplicado nos 3 locais onde existe busca de CEP:

1. **Cardapio online** (`src/pages/UnitPage.tsx`) - checkout de entrega
2. **Perfil da Loja** (`src/components/dashboard/StoreProfileTab.tsx`) - endereco da loja
3. **Onboarding Wizard** (`src/components/dashboard/OnboardingWizard.tsx`) - configuracao inicial

## Como vai funcionar

- Conforme o usuario digita o CEP, ao completar 8 digitos numericos, a busca e disparada automaticamente
- Um indicador de carregamento (spinner) aparece dentro do campo enquanto busca
- O `onBlur` continua funcionando como fallback
- O botao "Buscar" e removido completamente

## Secao Tecnica

### 1. UnitPage.tsx (linhas 949-972)
- No `onChange` do campo CEP, apos atualizar o valor, verificar se `cleaned.length === 8` e chamar `fetchCustomerCep` automaticamente
- Remover o `<button>` "Buscar" (linhas 964-972)
- Manter o `onBlur` como fallback

### 2. StoreProfileTab.tsx (linhas 820-845)
- No `onChange` do campo CEP (linha 822), apos formatar, verificar se `cleaned.length === 8` e chamar `fetchCep` automaticamente
- Remover o `<Button>` "Buscar" (linhas 833-845) e o wrapper `<div>` ao redor
- Ajustar o layout (remover flex e grid que acomodavam o botao)

### 3. OnboardingWizard.tsx (linhas 262-280)
- No `onChange` do campo CEP (linha 267), apos atualizar, verificar se `cleaned.length === 8` e chamar `lookupCep` automaticamente
- Remover o `<Button>` com icone de busca (linhas 270-279)
- Ajustar o layout (remover flex wrapper)

### Indicador de carregamento
Em cada campo, adicionar um icone de loading (Loader2) como sufixo visual dentro do campo quando a busca estiver em andamento, usando uma `div` relativa com o spinner posicionado a direita do input.

Nenhuma mudanca no banco de dados necessaria.

