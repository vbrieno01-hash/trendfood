

## Plano: Adicionar botão Pausar/Ativar nos bairros de entrega

### Problema
O `NeighborhoodManager` não tem opção de pausar bairros — só deletar. A tabela já tem a coluna `active`, mas a UI não a utiliza para toggle.

### Correção

**Arquivo: `src/components/dashboard/NeighborhoodManager.tsx`**

1. Importar o componente `Switch` de `@/components/ui/switch`
2. Em cada linha de bairro, adicionar um `Switch` antes do botão de deletar:
   - `checked={n.active}`
   - `onCheckedChange` chama `updateMutation.mutate({ id: n.id, active: !n.active })`
3. Quando `active === false`, aplicar `opacity-50` na linha para indicar visualmente que está pausado
4. Exibir tooltip ou texto pequeno indicando o estado (ex: "Pausado")

### Visual final de cada linha

```text
[Nome do Bairro]  [R$ ___]  [Switch ●]  [🗑]
```

Bairro pausado fica com opacidade reduzida e não aparece no checkout (já filtrado pelo hook `useDeliveryNeighborhoods` que filtra `active = true`).

### Arquivos modificados
| Arquivo | Mudança |
|---------|---------|
| `src/components/dashboard/NeighborhoodManager.tsx` | Adicionar Switch de ativar/pausar em cada bairro |

