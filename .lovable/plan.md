

# Limpeza de imports e variaveis nao utilizados no TablesTab.tsx

## O que sera feito
Remover codigo morto que ficou apos a exclusao dos links dos paineis de Cozinha e Garcom.

## Alteracoes

### Arquivo: `src/components/dashboard/TablesTab.tsx`

1. **Remover imports nao utilizados** da linha de imports do lucide-react:
   - `ExternalLink`
   - `UtensilsCrossed`
   - `ChefHat`

2. **Remover variaveis nao utilizadas** (aproximadamente linhas 78-79):
   - `const kitchenUrl = ...`
   - `const waiterUrl = ...`

3. **Remover import nao utilizado** do react-router-dom:
   - `useNavigate` (verificar se ainda e usado em outro lugar do componente -- ele e usado no `onClick` das mesas, entao permanece)

Nenhuma mudanca funcional, apenas limpeza de codigo.

