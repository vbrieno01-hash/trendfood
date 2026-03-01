

## Plano: Corrigir Cálculo de Frete Impreciso

### Problema
O endereço do cliente enviado para geocodificação usa apenas `CEP + Cidade + Estado`, descartando rua e bairro. O Nominatim resolve isso para o centro da cidade, gerando distâncias falsas (ex: 4.55 km mesmo estando no mesmo endereço).

### Causa (UnitPage.tsx, linha 118-120)
```typescript
// Atual — só CEP + cidade
const fullCustomerAddress = customerAddress.cep && customerAddress.city
  ? [customerAddress.cep, customerAddress.city, customerAddress.state, "Brasil"]
```

### Correção

**1. UnitPage.tsx — incluir rua e bairro no endereço de geocodificação**

Trocar a montagem do `fullCustomerAddress` para incluir todos os campos disponíveis:
```typescript
const fullCustomerAddress = [
  customerAddress.street,
  customerAddress.number,
  customerAddress.neighborhood,
  customerAddress.city,
  customerAddress.state,
  customerAddress.cep,
  "Brasil"
].map(p => p.trim()).filter(Boolean).join(", ");
```

Isso envia `"Caminho Santa Marta, 55, Vila Esperança, Cubatão, SP, 11540215, Brasil"` ao invés de `"11540215, Cubatão, SP, Brasil"`, resultando em geocodificação precisa.

**2. Edge function (geocode-distance) — já funciona**

A edge function já tenta ViaCEP + Nominatim com o texto completo. Com um endereço mais detalhado, o resultado será muito mais preciso.

### Resultado esperado
- Mesmo endereço → ~0 km → faixa 1 (R$5) ou coordenadas idênticas (R$5)
- Endereço próximo → distância real precisa

### Arquivo alterado
- `src/pages/UnitPage.tsx` (1 linha)

