

## Plano: Corrigir toggle "Permitir outro bairro" que não persiste

### Problema
Quando você desliga o toggle "Permitir outro bairro", ele salva corretamente no banco: `{"free_above": 100, "allow_other_neighborhood": false}`.

Porém, quando você salva o formulário principal de "Dados da Loja" (botão Salvar no topo), a linha 183 do `StoreProfileTab.tsx` sobrescreve `delivery_config` com apenas `{ free_above: freeAbove }`, **apagando** o campo `allow_other_neighborhood`. Na próxima vez que a página carrega, o campo não existe mais, e o código interpreta como `true` (ligado).

### Solução

**`src/components/dashboard/StoreProfileTab.tsx`** — Na hora de salvar o formulário principal, preservar os campos existentes do `delivery_config` e só atualizar `free_above`:

```typescript
// Antes (bugado):
delivery_config: { free_above: freeAbove }

// Depois (correto):
delivery_config: { 
  ...(organization.delivery_config as Record<string, any>), 
  free_above: freeAbove 
}
```

Isso garante que `allow_other_neighborhood` (e qualquer outro campo futuro) não seja apagado ao salvar o formulário.

### Impacto
- 1 arquivo, 1 linha alterada
- Corrige o bug real: toggle para de resetar ao salvar o formulário

