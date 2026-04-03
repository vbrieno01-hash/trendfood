

## Plano: Corrigir inputs do LoyaltyTab que não aceitam certos valores

### Problema
Os campos usam `||` (OR lógico) para calcular o valor efetivo:
```js
const effectiveSpend = spendPerPoint || String(config?.spend_per_point ?? 50);
```

O operador `||` trata `"0"` e `""` como falsy, então quando o usuário apaga o campo para digitar um novo valor (campo fica `""`), ele volta instantaneamente ao valor do servidor. Impossível editar.

### Solução
Trocar `||` por uma verificação explícita: usar o estado local se ele já foi tocado (`dirty`), caso contrário usar o valor do servidor.

**Lógica corrigida:**
```js
const effectiveSpend = dirty && spendPerPoint !== "" ? spendPerPoint : String(config?.spend_per_point ?? 50);
const effectivePoints = dirty && pointsToRedeem !== "" ? pointsToRedeem : String(config?.points_to_redeem ?? 10);
const effectiveValue = dirty && rewardValue !== "" ? rewardValue : String(config?.reward_value ?? 20);
```

Porém isso ainda impede apagar o campo. Melhor abordagem: inicializar os estados locais a partir do config quando ele carrega, e depois usar apenas os estados locais.

**Abordagem final:** Usar `useEffect` para sincronizar os estados locais quando `config` carrega pela primeira vez, e depois usar apenas os estados locais nos inputs.

### Arquivo modificado
| Arquivo | Mudança |
|---------|---------|
| `src/components/dashboard/LoyaltyTab.tsx` | Adicionar `useEffect` para sync inicial dos estados; remover lógica `effective*` baseada em `||`; usar estados locais diretamente nos inputs |

