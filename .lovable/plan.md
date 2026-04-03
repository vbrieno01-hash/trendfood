

## Plano: Editar nome do bairro inline

### Mudança

**Arquivo: `src/components/dashboard/NeighborhoodManager.tsx`**

Transformar o `<span>` com o nome do bairro em um `<Input>` editável inline (mesmo padrão usado para a taxa):

- Trocar `<span className="text-sm font-medium...">{n.name}</span>` por um `<Input>` com `defaultValue={n.name}`
- No `onBlur`, se o valor mudou, chamar `updateMutation.mutate({ id: n.id, name: novoNome.trim() })`
- Validar que o nome não está vazio antes de salvar
- Manter o estilo compacto (`h-8 text-sm`) consistente com o input da taxa

### Resultado visual por linha

```text
[___Nome editável___]  [Pausado?]  [R$ ___]  [Switch]  [🗑]
```

### Arquivos modificados
| Arquivo | Mudança |
|---------|---------|
| `src/components/dashboard/NeighborhoodManager.tsx` | Trocar span do nome por Input editável com onBlur save |

