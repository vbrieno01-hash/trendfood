

## Plano: Toggle para pausar "Outro bairro" na página pública

### Problema
A opção "Outro bairro — Sob consulta" sempre aparece no dropdown de bairros da página pública. O dono quer poder desativar isso quando não tem motoboy para ir longe.

### Solução

**1. `delivery_config` JSON** — Adicionar campo `allow_other_neighborhood` (default `true` para compatibilidade):
- Armazenado no JSON `delivery_config` da tabela `organizations`, sem migração necessária.

**2. `src/components/dashboard/NeighborhoodManager.tsx`** — Adicionar toggle:
- Receber `organization` como prop (em vez de só `organizationId`)
- Ler `delivery_config.allow_other_neighborhood` (default `true`)
- Mostrar um Switch "Permitir 'Outro bairro'" com descrição tipo "Quando desativado, clientes só podem escolher bairros cadastrados"
- Ao alterar, salvar no `delivery_config` da org

**3. `src/components/dashboard/StoreProfileTab.tsx`** — Passar `organization` inteira para o `NeighborhoodManager`

**4. `src/pages/UnitPage.tsx`** — Condicionar a opção "Outro bairro":
- Ler `delivery_config.allow_other_neighborhood` da org
- Se `false`, não renderizar o `<SelectItem value="__outro__">`

### Impacto
- 3 arquivos alterados
- Sem migração (campo opcional no JSON existente)
- Compatível com lojas existentes (default `true`)

