

# Plano: Deletar motoboy por completo (hard delete)

## O que sera feito

Trocar o soft-delete (marcar `active = false`) por um hard delete (apagar o registro da tabela `couriers`). O aviso no AlertDialog sera atualizado para deixar claro que a conta sera apagada permanentemente e que o motoboy so podera voltar se cadastrar-se novamente.

## Secao tecnica

```text
Arquivo 1: src/hooks/useCourier.ts (linha 244-257)
  - useDeleteCourier: trocar .update({ active: false })
    por .delete().eq("id", courierId)
  - Tambem invalidar queryKey ["courier-stats"] e ["deliveries"]

Arquivo 2: src/components/dashboard/CourierDashboardTab.tsx (linhas 582-600)
  - Atualizar texto do AlertDialogDescription:
    "Tem certeza que deseja APAGAR a conta de {nome}?
     Essa acao e irreversivel. O motoboy sera deslogado
     e precisara se cadastrar novamente para acessar o painel."
  - Manter botao vermelho "Apagar"
```

A tabela `deliveries` usa `courier_id` sem foreign key constraint, entao o historico de entregas nao sera afetado — o `courier_id` simplesmente ficara como um UUID orfao nas entregas antigas.

