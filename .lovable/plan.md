

## Voltar para o Dashboard quando aberto pelo lojista

### Contexto
Na `TablesTab.tsx`, ao clicar em uma mesa o lojista navega para `/unidade/{slug}/mesa/{n}` com `state: { from: "dashboard" }`. O botão "Voltar para identificação da mesa" hoje só reseta o estado local — mas o lojista quer voltar para `/dashboard?tab=tables` (a tela de onde ele veio).

### Solução
Em `src/pages/TableOrderPage.tsx`:

1. Detectar a origem usando o `_fromDashboard` (já existe na linha 34, lendo `location.state?.from === "dashboard"`).

2. Alterar o handler `backToIdentification` para ramificar:
   - **Se `_fromDashboard === true`**: `navigate("/dashboard?tab=tables")` — volta para a aba Mesas & Comandas do dashboard.
   - **Caso contrário** (cliente real escaneando QR): mantém o comportamento atual (reseta estado e volta para identificação da mesa).

3. Ajustar o texto do botão dinamicamente:
   - Lojista vindo do dashboard: **"Voltar para Mesas & Comandas"**
   - Cliente normal: **"Voltar para identificação da mesa"** (como está hoje)

### Resultado
- Lojista testando pelo dashboard → botão volta para `/dashboard?tab=tables` (a tela do print).
- Cliente real na mesa → botão continua resetando para a tela de nomes.

