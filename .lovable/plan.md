
# Indicador fixo de status da impressao automatica no rodape do Dashboard

## O que sera feito
Adicionar uma barra fixa no rodape (bottom) do Dashboard que mostra o status atual da impressao automatica e das notificacoes. O indicador fica sempre visivel, independente da aba ativa, dando confianca ao usuario de que o sistema esta monitorando pedidos em segundo plano.

## Design
- Barra fina fixada no bottom da tela (`fixed bottom-0`)
- Fundo semi-transparente com glassmorphism (`bg-card/90 backdrop-blur`)
- Dois indicadores lado a lado:
  - **Impressao automatica**: icone de impressora + "Impressao automatica ativa" (verde) ou "Impressao automatica desativada" (cinza/vermelho)
  - **Notificacoes**: icone de sino + "Notificacoes ativas" ou "Notificacoes desativadas"
- Status Bluetooth (se modo bluetooth): icone + "Impressora conectada" ou "Desconectada"
- Cada indicador com um pequeno dot colorido (verde pulsante = ativo, cinza = inativo)
- Clicavel: ao clicar no indicador de impressao, navega para aba Cozinha (ou faz toggle direto)

## Detalhes tecnicos

### `src/pages/DashboardPage.tsx`
- Adicionar um `div` fixo no bottom, logo antes do fechamento do container principal (linha ~690)
- Usa os estados ja existentes: `autoPrint`, `notificationsEnabled`, `btConnected`, `printMode`
- O `main` content precisa de `pb-10` (padding-bottom) para nao ficar escondido atras da barra
- Componente inline (simples o suficiente para nao precisar de arquivo separado)

### Estrutura visual

```text
+------------------------------------------------------------------+
| [dot] Impressora: Ativa  |  [dot] Notificacoes: Ativas  |  BT: OK |
+------------------------------------------------------------------+
```

## Arquivo alterado
- `src/pages/DashboardPage.tsx` — adicionar barra fixa + padding-bottom no main
