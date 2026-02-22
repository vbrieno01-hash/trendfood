
# Implementar Sistema de Ponto para Motoboys

A tabela `courier_shifts` ainda nao foi criada no banco de dados. Vou criar tudo de uma vez.

## Passo 1 -- Criar tabela `courier_shifts`

Migracao SQL para criar a tabela com RLS e Realtime:

```text
courier_shifts
- id (uuid PK)
- courier_id (uuid NOT NULL)
- organization_id (uuid NOT NULL)
- started_at (timestamptz NOT NULL DEFAULT now())
- ended_at (timestamptz NULL)
- created_at (timestamptz NOT NULL DEFAULT now())
```

Politicas RLS: SELECT/INSERT/UPDATE publicos (mesmo padrao das tabelas de motoboy). DELETE restrito ao dono da organizacao.

Realtime habilitado para atualizar o dashboard do dono em tempo real.

## Passo 2 -- Hooks em `src/hooks/useCourier.ts`

Adicionar 5 hooks novos no final do arquivo:

| Hook | Funcao |
|------|--------|
| `useActiveShift(courierId)` | Retorna turno ativo (ended_at IS NULL) |
| `useStartShift()` | Mutation para criar novo turno |
| `useEndShift()` | Mutation para setar ended_at = now() |
| `useOrgActiveShifts(orgId)` | Todos os turnos ativos da org (quem esta online) |
| `useOrgShiftHistory(orgId, date)` | Historico de turnos por data |

Cada hook usa `as any` para contornar a tipagem auto-gerada (mesmo padrao usado nas outras queries de `couriers` e `deliveries`).

Realtime subscription no `useOrgActiveShifts` para invalidar cache quando um turno muda.

## Passo 3 -- `src/pages/CourierPage.tsx`

Alteracoes na tela do motoboy:

- Importar `useActiveShift`, `useStartShift`, `useEndShift`
- Adicionar botao grande "Iniciar Turno" / "Encerrar Turno" logo abaixo do header
- Quando turno ativo: badge verde "Online ha X min" com timer atualizado a cada 60s
- Bloquear botao "Aceitar" se nao tiver turno ativo, com toast explicativo

## Passo 4 -- `src/components/dashboard/CourierDashboardTab.tsx`

Alteracoes no dashboard do dono:

- Importar `useOrgActiveShifts` e `useOrgShiftHistory`
- No card de cada motoboy: bolinha verde/vermelha indicando se esta online
- Quando online: exibir "Entrou as HH:MM" e "Ha Xh trabalhando"
- Na secao expandida do card: lista de turnos do dia selecionado (check-in / check-out)

## Resumo das mudancas

| Arquivo | Tipo de alteracao |
|---------|-------------------|
| Migracao SQL | Criar tabela + RLS + Realtime |
| `src/hooks/useCourier.ts` | Adicionar 5 hooks + interface CourierShift |
| `src/pages/CourierPage.tsx` | Botao turno + badge online + bloqueio aceitar |
| `src/components/dashboard/CourierDashboardTab.tsx` | Status online + historico turnos |
