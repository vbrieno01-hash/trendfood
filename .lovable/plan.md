

# Corrigir Formato de Endereco no Onboarding para Novas Lojas

## Problema

O `OnboardingWizard` salva o endereco da loja no formato legado com tracos:
```
Rua X, 100 Apto 4 - Centro, Cubatao - SP
```

Enquanto o motor de frete (`useDeliveryFee`) e o `StoreProfileTab` esperam o formato estruturado com virgulas e CEP:
```
11510-170, Rua X, 100, Apto 4, Centro, Cubatao, SP, Brasil
```

Resultado: lojas novas que preenchem o endereco durante o onboarding terao o calculo de frete quebrado (geocoder nao encontra o endereco).

Os demais fluxos (checkout do cliente, perfil da loja, configuracao de frete) estao funcionais.

## Solucao

Reutilizar a funcao `buildStoreAddress` do `StoreProfileTab` no `OnboardingWizard`, garantindo que o endereco seja salvo no formato correto desde o primeiro momento.

## Detalhes tecnicos

### Arquivo: `src/pages/UnitPage.tsx`
- Nenhuma alteracao necessaria. O fluxo do cliente ja esta correto.

### Arquivo: `src/components/dashboard/OnboardingWizard.tsx`

1. **Importar ou replicar `buildStoreAddress`**: Usar a mesma logica que monta o endereco no formato `CEP, rua, numero, complemento, bairro, cidade, estado, Brasil`.

2. **Alterar `saveStep2`** (linha 113-127): Substituir a montagem manual do endereco pela chamada a `buildStoreAddress`, passando os campos estruturados (`cep`, `street`, `number`, `complement`, `neighborhood`, `city`, `state`).

3. **Fallback do ViaCEP no onboarding**: Adicionar o mesmo `getStateFromCep` para pre-preencher o estado quando o ViaCEP falhar durante o onboarding (mesma logica ja aplicada no UnitPage).

### Refatoracao opcional

Extrair `buildStoreAddress` e `parseStoreAddress` para um arquivo utilitario compartilhado (ex: `src/lib/storeAddress.ts`) para evitar duplicacao entre `StoreProfileTab` e `OnboardingWizard`. Isso nao e obrigatorio mas melhora a manutencao.

### Resumo de arquivos

| Arquivo | Acao |
|---------|------|
| `src/lib/storeAddress.ts` | Novo arquivo com `buildStoreAddress`, `parseStoreAddress` e `getStateFromCep` |
| `src/components/dashboard/OnboardingWizard.tsx` | Usar `buildStoreAddress` no `saveStep2`, adicionar fallback do ViaCEP |
| `src/components/dashboard/StoreProfileTab.tsx` | Importar de `storeAddress.ts` em vez de definir localmente |
| `src/pages/UnitPage.tsx` | Importar `getStateFromCep` de `storeAddress.ts` em vez de definir localmente |

