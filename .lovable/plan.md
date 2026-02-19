
# Impressão Automática de Pedidos

## Como a impressão funciona no navegador

O navegador não permite controlar impressoras diretamente sem interação do usuário — essa é uma limitação de segurança de todos os navegadores modernos. Portanto, existem duas abordagens possíveis:

**Opção A (implementada aqui): Impressão semi-automática com `window.print()`**
- Quando um novo pedido chega, abre automaticamente uma janela de impressão do sistema operacional com o comprovante formatado para impressora térmica (80mm)
- O usuário precisa apenas pressionar Enter ou clicar em "Imprimir" na janela do sistema
- Funciona com qualquer impressora — inclusive as térmicas mais comuns (Epson, Bematech, etc.)
- Também adiciona um botão manual "Imprimir" em cada card de pedido, caso a impressão automática seja bloqueada

**Opção B: Integração com impressoras via serviço externo (ex: QZ Tray, Star WebPRNT)**
- Requer instalação de software adicional no computador da cozinha
- Muito mais complexo e fora do escopo atual

A **Opção A** é a mais prática e funciona sem nenhuma instalação extra.

## O que será implementado

### 1. Comprovante formatado para impressora térmica
Um layout de impressão otimizado para papel 80mm com:
- Nome da loja + número da mesa em destaque
- Horário do pedido
- Lista de itens com quantidade
- Observações (se houver)
- Linha separadora no final

### 2. Impressão automática na KitchenPage (`/cozinha`)
No `KitchenPage.tsx` (tela dedicada da cozinha), quando chega um novo pedido via Realtime:
- O sistema aguarda 1 segundo para os `order_items` carregarem junto ao pedido
- Abre automaticamente a janela de impressão do sistema

### 3. Impressão automática na KitchenTab (aba do dashboard)
No `KitchenTab.tsx` (aba dentro do painel), mesma lógica — impressão automática ao chegar novo pedido.

### 4. Botão manual de impressão em cada card
Cada card de pedido terá um botão de impressora, permitindo reimprimir se necessário.

### 5. Toggle para ativar/desativar impressão automática
Um switch no header da tela de cozinha permite ao usuário desativar a impressão automática caso não queira usar (preferência salva no `localStorage`).

## Arquivos afetados

| Arquivo | O que muda |
|---|---|
| `src/lib/printOrder.ts` | Novo arquivo — função utilitária que gera o HTML de impressão e dispara `window.print()` |
| `src/pages/KitchenPage.tsx` | Chama `printOrder` no callback de INSERT do Realtime + botão de impressão manual + toggle |
| `src/components/dashboard/KitchenTab.tsx` | Mesma lógica do KitchenPage |

## Detalhes técnicos da impressão

A função `printOrder` vai:
1. Criar uma nova janela (`window.open`)
2. Injetar HTML formatado para 80mm com estilos CSS de impressão
3. Chamar `window.print()` na nova janela
4. Fechar a janela após a impressão

```
┌─────────────────────┐
│  🍳 BURGUER DO REI  │
│  ═══════════════════│
│  MESA 5             │
│  14:32              │
│  ───────────────────│
│  2x  X-Burguer      │
│  1x  Batata Frita   │
│  1x  Coca-Cola      │
│  ───────────────────│
│  Obs: sem cebola    │
│  ═══════════════════│
│  NOVO PEDIDO - KDS  │
└─────────────────────┘
```

## Fluxo de funcionamento

1. Cliente faz pedido → INSERT no banco
2. Realtime dispara evento INSERT na KitchenPage/KitchenTab
3. Sistema verifica se impressão automática está ativada
4. Abre janela de impressão formatada automaticamente
5. Usuário confirma na janela do sistema (ou cancela)
6. O pedido também aparece no KDS normalmente
