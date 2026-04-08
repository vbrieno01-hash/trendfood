

## Plano: Adicionar intervalo de almoço/descanso no horário de funcionamento

### Ideia
Cada dia ganha um campo opcional de "pausa" (ex: 12:00–13:30) onde a loja fecha temporariamente. Lojas existentes **não são afetadas** — o campo `break_from`/`break_to` só aparece nos defaults de lojas novas.

### Alterações

**1. `src/hooks/useOrganization.ts`** — Expandir a interface `BusinessHoursDay`:
```typescript
export interface BusinessHoursDay {
  open: boolean;
  from: string;
  to: string;
  break_from?: string;  // novo, opcional
  break_to?: string;    // novo, opcional
}
```
Como os campos são opcionais, lojas existentes que não têm `break_from`/`break_to` no JSON continuam funcionando normalmente.

**2. `src/components/dashboard/BusinessHoursSection.tsx`** — UI para o intervalo:
- Adicionar um checkbox/toggle "Intervalo" por dia que revela dois campos `time` (break_from, break_to)
- `DEFAULT_BUSINESS_HOURS` para lojas novas inclui `break_from: ""`, `break_to: ""` (sem pausa por padrão)
- Lojas existentes sem os campos simplesmente não mostram a pausa ativa

**3. `src/lib/storeStatus.ts`** — Lógica de pausa no `getStoreStatus`:
- Depois de determinar que a loja está "aberta" pelo turno principal, verificar se `break_from` e `break_to` existem
- Se `currentMinutes >= break_from && currentMinutes < break_to`, retornar `{ open: false, opensAt: break_to }`
- Isso bloqueia pedidos durante o intervalo e mostra "Abre às HH:MM"

**4. Trigger do banco `validate_store_open_for_order`** — Mesma lógica de pausa:
- Após confirmar que está dentro do turno, checar `break_from`/`break_to` no JSON
- Se estiver no intervalo, `RAISE EXCEPTION 'Loja em intervalo...'`
- Migração SQL para atualizar a função

**5. Testes** — Adicionar cenários em `storeStatus.test.ts` para pausa

### Compatibilidade
- Campos opcionais = zero impacto em lojas existentes
- Só lojas que configuram o intervalo terão a validação ativa
- `DEFAULT_BUSINESS_HOURS` não define pausa ativa, apenas disponibiliza os campos

