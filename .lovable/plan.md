

## Plano: Adicionar cards de bairros próximos ao Checkout (AddressFields)

### Problema

Os cards de seleção de bairro só existem no `UnitPage.tsx`. O componente `AddressFields.tsx` (usado no checkout do cliente) busca o CEP e GPS mas não mostra opções de bairros próximos. O cliente pode ficar com o bairro errado sem ter como corrigir facilmente.

### Alterações

**1. `src/components/checkout/AddressFields.tsx`**
- Adicionar estado `addressCandidates` (mesmo tipo do UnitPage)
- No `fetchCep` (useEffect): ler `data.nearby` e popular os candidatos se `nearby.length > 1`
- No `handleGetLocation`: ler `data.candidates` do reverse-geocode e popular os candidatos
- Renderizar cards clicáveis (mesmo estilo do UnitPage) entre o botão GPS e os campos de endereço
- Ao clicar num card: preencher CEP, rua e bairro automaticamente
- Limpar candidatos quando o CEP muda manualmente

**2. `src/components/dashboard/StoreProfileTab.tsx`** (opcional, baixa prioridade)
- O dono da loja configura o endereço uma única vez, cards são menos necessários aqui
- Não alterar neste momento

**3. `src/components/dashboard/OnboardingWizard.tsx`** (opcional, baixa prioridade)
- Mesma situação do StoreProfileTab — configuração pontual
- Não alterar neste momento

### UI no Checkout

```text
[ 📍 Usar minha localização ]

┌─────────────────────────────┐
│ 📍 Rua X, Vila Couto        │
│    11740-000                 │
└─────────────────────────────┘
┌─────────────────────────────┐
│ 📍 Rua X, Jardim Casqueiro   │
│    11533-050                 │
└─────────────────────────────┘

CEP: [_________]
Rua: [_________]
...
```

### Escopo

- Foco no **checkout** (`AddressFields.tsx`) que é o fluxo do cliente final
- Backend já está pronto (viacep-proxy e reverse-geocode já retornam `nearby`/`candidates`)
- Apenas mudanças no frontend

