

# Sistema de Fila de Impressao Multi-Loja

## Resumo

Criar um sistema de impressao profissional com dois modos: **Desktop (Script)** onde pedidos ficam numa fila no banco aguardando captura por script externo, e **Mobile (Bluetooth)** onde o lojista conecta sua impressora termica via Web Bluetooth API diretamente do celular/PWA.

## O que muda para o usuario

Na aba **Configuracoes** do dashboard, aparece uma nova secao "Modo de Impressao" com duas opcoes:
- **Desktop (Script)**: pedidos sao salvos na fila e um script externo (polling) busca e imprime. O lojista ve um aviso "Pedido enviado para a cozinha".
- **Mobile (Bluetooth)**: o lojista pareia a impressora Bluetooth pelo navegador e os pedidos sao enviados diretamente via ESC/POS.

Na aba **Cozinha (KDS)**, quando o auto-print esta ativo ou o lojista clica em imprimir, o sistema usa o modo configurado ao inves de sempre abrir `window.print()`.

## Detalhes tecnicos

### 1. Migracao: tabela `fila_impressao`

```text
CREATE TABLE public.fila_impressao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  order_id uuid,
  conteudo_txt text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  printed_at timestamptz
);

ALTER TABLE public.fila_impressao ENABLE ROW LEVEL SECURITY;
```

Politicas RLS -- apenas o dono da loja ve/atualiza seus proprios registros:

- **SELECT**: `auth.uid() = (SELECT user_id FROM organizations WHERE id = fila_impressao.organization_id)`
- **INSERT**: mesma logica (owner only)
- **UPDATE**: mesma logica (owner only, para marcar como impresso)
- **DELETE**: mesma logica (owner only)

Habilitar realtime para polling em tempo real:
```text
ALTER PUBLICATION supabase_realtime ADD TABLE public.fila_impressao;
```

### 2. Migracao: coluna `print_mode` na tabela `organizations`

```text
ALTER TABLE public.organizations
ADD COLUMN print_mode text NOT NULL DEFAULT 'browser';
```

Valores possiveis: `'browser'` (atual, window.print), `'desktop'` (fila no banco), `'bluetooth'` (Web Bluetooth).

### 3. Novo arquivo: `src/lib/bluetoothPrinter.ts`

Gerencia a conexao Web Bluetooth com impressoras termicas ESC/POS:

- `requestBluetoothPrinter()` -- abre o dialogo de pareamento do navegador, filtrando por servicos de impressora serial
- `sendToBluetoothPrinter(device, text)` -- converte texto formatado 58mm em comandos ESC/POS basicos (texto, corte) e envia via GATT characteristic
- `disconnectPrinter(device)` -- desconecta limpo
- Armazena o `device.id` no localStorage para reconexao automatica

Formato ESC/POS simplificado:
- Inicializacao: `\x1B\x40`
- Texto centralizado: `\x1B\x61\x01`
- Negrito on/off: `\x1B\x45\x01` / `\x1B\x45\x00`
- Corte parcial: `\x1D\x56\x01`

### 4. Novo arquivo: `src/lib/printQueue.ts`

Funcoes para interagir com a fila de impressao:

- `enqueuePrint(orgId, orderId, contentText)` -- insere na `fila_impressao` com status `pendente`
- `markAsPrinted(printId)` -- atualiza status para `impresso` e seta `printed_at`
- `usePrintQueue(orgId)` -- hook que retorna pedidos pendentes com realtime subscription (para o script desktop monitorar)

### 5. Novo arquivo: `src/lib/formatReceiptText.ts`

Converte um pedido em texto puro formatado para 58mm (32 colunas) ou 80mm (48 colunas):

- Reutiliza a logica de parsing de `printOrder.ts` (parseNotes, itens, total)
- Retorna string pura (sem HTML) para uso no Bluetooth e na fila de texto
- Formato: nome da loja centralizado, divisor, mesa/entrega, itens com quantidade, total, dados do cliente

### 6. Alteracao: `src/lib/printOrder.ts`

Adicionar funcao `printOrderByMode(order, storeName, printMode, orgId, pixPayload, printerWidth)`:

- Se `printMode === 'browser'`: chama o `printOrder()` atual (window.open + window.print)
- Se `printMode === 'desktop'`: chama `formatReceiptText()` + `enqueuePrint()`, mostra toast "Pedido enviado para impressao"
- Se `printMode === 'bluetooth'`: chama `formatReceiptText()` + `sendToBluetoothPrinter()`, com fallback para `enqueuePrint()` se o Bluetooth falhar

### 7. Alteracao: `src/components/dashboard/KitchenTab.tsx`

- Receber nova prop `printMode` (vinda da org)
- No auto-print e no botao manual, usar `printOrderByMode()` ao inves de `printOrder()` direto

### 8. Alteracao: `src/pages/KitchenPage.tsx`

- Buscar `print_mode` da organizacao (ja vem no useOrganization)
- Passar para `printOrderByMode()`

### 9. Alteracao: `src/hooks/useOrganization.ts`

- Adicionar `print_mode` na interface `Organization` e no select da query

### 10. Alteracao: `src/hooks/useAuth.tsx`

- Adicionar `print_mode` no select da query de organizacao autenticada

### 11. Alteracao: `src/components/dashboard/SettingsTab.tsx`

Adicionar secao "Modo de Impressao" com:

- **Select** com 3 opcoes: Navegador (padrao), Desktop (Script), Mobile (Bluetooth)
- Quando selecionar **Bluetooth**: mostrar botao "Parear Impressora" que chama `requestBluetoothPrinter()`
- Status de conexao Bluetooth (conectado/desconectado)
- Salva `print_mode` na organizacao via update no banco

### 12. Seguranca

- RLS garante isolamento total: cada lojista so ve sua propria fila
- A fila usa `organization_id` vinculado ao `user_id` do dono
- Nenhum acesso publico a tabela `fila_impressao`
- Web Bluetooth e local ao dispositivo -- cada celular pareia sua propria impressora

### Fluxo Desktop (Script)

1. Pedido chega na cozinha
2. Sistema formata o recibo em texto puro
3. Insere na tabela `fila_impressao` com status `pendente`
4. Toast: "Pedido enviado para a cozinha"
5. Script externo faz polling (ou usa realtime) na tabela, imprime, e marca como `impresso`

### Fluxo Mobile (Bluetooth)

1. Lojista pareia a impressora nas Configuracoes (uma vez)
2. Pedido chega na cozinha
3. Sistema formata em ESC/POS e envia direto via Web Bluetooth
4. Se falhar, cai no fallback (salva na fila)

### Compatibilidade Web Bluetooth

- Chrome Android: suportado
- Chrome Desktop (Windows/Linux/macOS): suportado
- Safari iOS: **nao suportado** -- mostra aviso orientando a usar AirPrint ou modo Desktop
- O sistema detecta `navigator.bluetooth` e esconde a opcao quando indisponivel

