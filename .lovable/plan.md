
# Corrigir botoes de voltar no site

## Problema
Ao clicar na seta de voltar na pagina da mesa (TableOrderPage), o sistema navega para `/dashboard` ao inves de voltar para a aba de Mesas no dashboard. Isso acontece porque o codigo usa `navigate("/dashboard")` em vez de `navigate(-1)`.

## Solucao
Alterar os dois botoes de voltar no `TableOrderPage.tsx` para sempre usar `navigate(-1)`, que volta para a pagina anterior real no historico do navegador (neste caso, a aba de Mesas no dashboard).

## Alteracoes

### Arquivo: `src/components/dashboard/TablesTab.tsx`
- Sem alteracoes necessarias. O `state: { from: "dashboard" }` pode permanecer para uso futuro, nao causa problemas.

### Arquivo: `src/pages/TableOrderPage.tsx`
- **Linha 469**: Trocar `fromDashboard ? navigate("/dashboard") : navigate(-1)` por `navigate(-1)`
- **Linha 545**: Mesma correcao

### Outros botoes de voltar verificados (OK, sem problemas):
- `PricingPage.tsx`: Ja usa `navigate(-1)` corretamente
- `UnitPage.tsx`: Usa `Link to="/"` (correto, volta para a landing)
- `DocsTerminalPage.tsx`: Usa `Link to="/dashboard"` (correto, e uma pagina de docs avulsa)

## Impacto
- Nenhuma mudanca funcional alem da correcao da navegacao
- O comportamento para clientes (que acessam via QR Code) permanece identico: `navigate(-1)` volta para a pagina anterior
