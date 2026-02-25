

# Plano: Adicionar botao de deletar motoboy

## O que sera feito

Adicionar um icone de lixeira (Trash2) em cada card de motoboy na lista "Motoboys cadastrados". Ao clicar, abre um AlertDialog de confirmacao. A exclusao sera feita via soft-delete (marcar `active = false`) para nao quebrar historico de entregas vinculadas.

## Secao tecnica

```text
Arquivo 1: src/hooks/useCourier.ts
  - Nova hook useDeleteCourier():
    useMutation que faz update na tabela couriers
    setando active = false onde id = courierId
    Invalida queryKey ["couriers"]

Arquivo 2: src/components/dashboard/CourierDashboardTab.tsx
  - Importar useDeleteCourier
  - Na linha ~536 (div com nome/phone), adicionar botao Trash2
    ao lado direito do card, com AlertDialog de confirmacao
    "Tem certeza que deseja remover {nome}?"
  - Ao confirmar, chama deleteCourier.mutate(c.id)
    com toast de sucesso/erro
```

O motoboy desativado nao aparecera mais na lista porque useOrgCouriers ja filtra por `active = true`.

