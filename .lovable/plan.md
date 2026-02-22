

# Sistema de Ponto para Motoboys (Check-in / Check-out)

## Problema

Atualmente nao ha como saber se um motoboy realmente foi trabalhar. O dono pode acabar pagando alguem que ficou em casa.

## Solucao

Criar um sistema de "bater ponto" onde o motoboy marca quando comecou e quando terminou o turno. O dono ve no dashboard quem esta online e o historico de turnos.

## Como funciona

**Para o motoboy** (tela `/motoboy`):
- Botao grande "Iniciar Turno" / "Encerrar Turno" na tela principal
- Quando online, aparece um indicador verde com o tempo decorrido
- So pode aceitar entregas se estiver com turno ativo

**Para o dono** (aba Motoboys no dashboard):
- Indicador de quem esta online agora (bolinha verde/vermelha)
- No card de cada motoboy: horario de entrada, tempo trabalhado no dia
- Historico de turnos por data (filtro por dia)

## Alteracoes

### 1. Nova tabela `courier_shifts`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| courier_id | uuid FK | Referencia ao motoboy |
| organization_id | uuid | Organizacao |
| started_at | timestamptz | Hora do check-in |
| ended_at | timestamptz (null) | Hora do check-out (null = ainda trabalhando) |
| created_at | timestamptz | |

RLS: SELECT publico, INSERT publico, UPDATE publico (mesmo padrao das outras tabelas de motoboy).

Realtime habilitado para atualizacao em tempo real no dashboard do dono.

### 2. Hooks novos em `src/hooks/useCourier.ts`

- `useActiveShift(courierId)` -- retorna turno ativo (ended_at IS NULL)
- `useStartShift()` -- mutation para criar turno
- `useEndShift()` -- mutation para setar ended_at
- `useOrgActiveShifts(orgId)` -- todos os turnos ativos da org (quem esta online)
- `useOrgShiftHistory(orgId, date)` -- historico de turnos por data

### 3. `src/pages/CourierPage.tsx`

- Botao "Iniciar Turno" / "Encerrar Turno" no topo, abaixo do header
- Quando turno ativo: badge verde "Online ha X min", timer atualizado a cada minuto
- Bloquear aceitar entregas se nao tiver turno ativo (botao desabilitado com tooltip)

### 4. `src/components/dashboard/CourierDashboardTab.tsx`

- No card de cada motoboy: bolinha verde se tem turno ativo, vermelha se nao
- Exibir "Entrou as HH:MM" e "Ha X horas trabalhando" quando online
- Secao de historico de turnos no card expandido (lista de check-in/check-out do dia selecionado)

## Detalhes tecnicos

### Migracao SQL

```sql
CREATE TABLE public.courier_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.courier_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courier_shifts_select_public" ON public.courier_shifts
  FOR SELECT USING (true);
CREATE POLICY "courier_shifts_insert_public" ON public.courier_shifts
  FOR INSERT WITH CHECK (true);
CREATE POLICY "courier_shifts_update_public" ON public.courier_shifts
  FOR UPDATE USING (true);
CREATE POLICY "courier_shifts_delete_owner" ON public.courier_shifts
  FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM organizations WHERE id = courier_shifts.organization_id)
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.courier_shifts;
```

### Timer no CourierPage

```typescript
// Atualiza a cada 60s para mostrar "Online ha X min"
const [now, setNow] = useState(Date.now());
useEffect(() => {
  const interval = setInterval(() => setNow(Date.now()), 60_000);
  return () => clearInterval(interval);
}, []);
```

### Bloqueio de aceitar entrega sem turno

No botao "Aceitar", verificar se `activeShift` existe. Se nao, mostrar toast "Inicie seu turno antes de aceitar entregas".

