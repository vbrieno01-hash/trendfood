
# Adicionar dialog de confirmacao antes do checkout

## Fluxo completo

1. **Usuario NAO logado**: Clica em qualquer plano pago -> vai para `/auth` criar conta (sem dialog, comportamento atual)
2. **Usuario logado**: Clica em "Assinar Pro" ou "Assinar Enterprise" -> abre dialog de confirmacao -> confirma -> abre link do Cakto em nova aba

O dialog so aparece para usuarios autenticados, garantindo que a conta ja existe antes de pagar.

## O que o dialog mostra

- Nome do plano (ex: "Pro")
- Preco (ex: "R$ 99/mes")
- Lista das features do plano
- Botao "Continuar para pagamento" (abre o Cakto)
- Botao "Cancelar"

## Detalhes tecnicos

### Arquivo: `src/pages/PricingPage.tsx`

1. Adicionar estado `selectedPlan` que guarda os dados do plano clicado (ou `null` quando o dialog esta fechado)
2. Alterar `handleSelectPlan` para setar o `selectedPlan` em vez de abrir o link diretamente
3. Criar funcao `handleConfirmPlan` que executa a logica atual (abrir link do Cakto com email do usuario)
4. Renderizar um `AlertDialog` controlado pelo estado `selectedPlan`, mostrando nome, preco, features e os botoes de confirmar/cancelar

Componentes utilizados (ja existem no projeto):
- `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogAction`, `AlertDialogCancel`
- Icone `Check` do lucide-react

Nenhuma dependencia nova. Nenhuma alteracao no banco de dados.
