

## Plano: Frete por km individual (1km a 5km) editável

### O que muda

Trocar o sistema atual de 3 faixas (tier1/tier2/tier3) por taxas individuais por km: `fee_1km`, `fee_2km`, `fee_3km`, `fee_4km`, `fee_5km` + `free_above`. Cada km tem seu valor editável.

### Arquivos afetados

**1. `src/hooks/useDeliveryFee.ts`** — Nova interface e lógica:
```typescript
export interface DeliveryConfig {
  fee_1km: number;  // até 1km
  fee_2km: number;  // até 2km
  fee_3km: number;  // até 3km
  fee_4km: number;  // até 4km
  fee_5km: number;  // acima de 4km
  free_above: number;
}
```
`applyFeeTable` passa a usar `Math.ceil(distanceKm)` para determinar a faixa (1→fee_1km, 2→fee_2km, etc., ≥5→fee_5km).

**2. `src/hooks/useOrganization.ts`** — Atualizar a interface `DeliveryConfig` para os mesmos campos.

**3. `src/components/dashboard/StoreProfileTab.tsx`** — Substituir os 6 inputs atuais (faixa1/limite1/faixa2/limite2/faixa3/frete grátis) por 6 inputs simples:
- Até 1km → R$ ___
- Até 2km → R$ ___
- Até 3km → R$ ___
- Até 4km → R$ ___
- Acima de 4km → R$ ___
- Frete grátis acima de → R$ ___

Preview atualizado igual à imagem do usuário.

**4. `src/components/admin/PlatformConfigSection.tsx`** — Mesma lógica para o admin.

**5. `src/hooks/usePlatformDeliveryConfig.ts`** — Já usa spread com DEFAULT, funciona automaticamente.

### Compatibilidade

Os dados existentes no banco (`delivery_config` JSON) continuam funcionando — campos antigos são ignorados e os novos usam os defaults até serem salvos.

