

## Plano: Adicionar card de instalação do app no Dashboard

### Situação atual
- A página `/instalar` existe mas só é acessível por URL direta
- O dashboard (`HomeTab`) não tem nenhum link ou card para ela
- O lojista não sabe que pode instalar o app

### O que será feito

| # | Mudança |
|---|---------|
| 1 | Adicionar um card no `HomeTab.tsx` com ícone de celular, título "Instalar TrendFood" e botão que redireciona para `/instalar` |
| 2 | O card só aparece quando o app **não** está em modo standalone (já instalado) |
| 3 | Posicionar o card na área principal do dashboard, visível logo ao abrir |

### Detalhes técnicos
- Detecta `display-mode: standalone` via `window.matchMedia` — se já instalado, esconde o card
- Usa `useNavigate` para redirecionar ao `/instalar`
- Card com visual destacado (borda primária, ícone de download)

### Resultado
- 1 arquivo editado (`HomeTab.tsx`)
- Lojista vê o convite para instalar direto no dashboard
- Card desaparece automaticamente após instalação

