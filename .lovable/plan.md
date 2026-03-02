

## Plano: Mostrar cards de bairros próximos ao buscar endereço

### Problema

Hoje os candidatos de endereço só aparecem quando o GPS é usado. Quem digita o CEP ou usa o GPS não vê opções de bairros próximos se o ViaCEP retornar múltiplos resultados. Muitos clientes não sabem exatamente em qual bairro moram.

### Solução

Mostrar os candidatos de endereço (cards clicáveis com rua + bairro + CEP) também quando o CEP é digitado, não só pelo GPS. Trocar o Select por **cards visuais** mais intuitivos.

### Alterações

**1. `supabase/functions/viacep-proxy/index.ts`**
- Quando o CEP é consultado, buscar também endereços vizinhos usando a API de busca do ViaCEP (`/{UF}/{cidade}/{logradouro}/json/`) se o logradouro estiver disponível
- Retornar um campo `nearby` com até 5 resultados próximos (CEP, rua, bairro, label)

**2. `src/pages/UnitPage.tsx`**
- Na `fetchCustomerCep`: se o retorno incluir `nearby`, popular `addressCandidates`
- Trocar o `Select` por **cards clicáveis** (botões estilizados) mostrando rua, bairro e CEP de cada candidato
- O card selecionado fica com borda colorida (estilo similar ao seletor de tipo de pedido)
- Ao clicar, preenche automaticamente CEP, rua e bairro
- Limpar candidatos quando o usuário muda o CEP manualmente

### UI dos cards

```text
┌─────────────────────────────┐
│ 📍 Rua X, Vila Couto        │
│    11740-000                 │
└─────────────────────────────┘
┌─────────────────────────────┐
│ 📍 Rua X, Jardim Casqueiro   │
│    11533-050                 │
└─────────────────────────────┘
```

Cards aparecem logo abaixo do botão GPS (ou do campo CEP quando preenchido), antes dos campos de endereço.

