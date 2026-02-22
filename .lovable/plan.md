

# Adicionar Diaria na Taxa do Motoboy

## Resumo
Adicionar um terceiro campo "Diaria" no card de configuracao de taxa do motoboy, para estabelecimentos que pagam um valor fixo por dia ao inves de (ou alem de) por corrida.

## Alteracoes

| Arquivo | O que muda |
|---------|-----------|
| `src/hooks/useDeliveryDistance.ts` | Adicionar `daily_rate` (opcional) ao type `CourierConfig` e ao `DEFAULT_COURIER_CONFIG` (default 0) |
| `src/components/dashboard/CourierDashboardTab.tsx` | Adicionar terceiro campo "Diaria" no card de taxa, com `CurrencyInput`. Salvar `daily_rate` junto com `base_fee` e `per_km` no `courier_config`. Mudar grid de 2 colunas para 3 colunas (responsivo). |

## Detalhes tecnicos

### CourierConfig
```typescript
export interface CourierConfig {
  base_fee: number;
  per_km: number;
  daily_rate?: number;
}
export const DEFAULT_COURIER_CONFIG: CourierConfig = { base_fee: 3.0, per_km: 2.5, daily_rate: 0 };
```

### Card de configuracao
O grid muda de `grid-cols-2` para `grid-cols-3` (desktop) e `grid-cols-1 sm:grid-cols-3` (mobile). O terceiro campo tera label "Diaria (por dia)" com `CurrencyInput`. O valor e salvo no campo `courier_config` da organizacao junto com os outros dois.

### Nenhuma migracao necessaria
O campo `courier_config` ja e `jsonb`, entao basta adicionar a chave `daily_rate` ao objeto. Valores existentes sem essa chave serao tratados como 0.

