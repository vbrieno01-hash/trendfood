

# Corrigir conexao Bluetooth para impressoras termicas genericas

## Problema raiz
O `requestBluetoothPrinter` usa filtros rigidos com 3 UUIDs de servico conhecidos. Impressoras termicas genericas (chinesas, sem marca) frequentemente usam UUIDs proprietarios diferentes. O pareamento funciona (o Chrome encontra o dispositivo), mas ao tentar conectar e buscar o servico GATT, nenhum dos 3 UUIDs bate, resultando em "NetworkError" seguido de "No writable characteristic found".

## Solucao
Duas mudancas no `src/lib/bluetoothPrinter.ts`:

### 1. Usar `acceptAllDevices` como fallback no pareamento
Manter os filtros como tentativa primaria, mas se falhar, tentar com `acceptAllDevices: true` + `optionalServices`. Isso permite parear com qualquer impressora Bluetooth, independente dos UUIDs que ela anuncia.

### 2. Descoberta dinamica de servicos no `connectToDevice`
Apos tentar os 3 UUIDs conhecidos sem sucesso, chamar `server.getPrimaryServices()` (sem parametro) para listar TODOS os servicos disponiveis na impressora. Depois iterar sobre cada servico buscando uma caracteristica com permissao de escrita. Isso garante que mesmo impressoras com UUIDs proprietarios sejam encontradas.

## Mudancas tecnicas em `src/lib/bluetoothPrinter.ts`

### `requestBluetoothPrinter()`
- Primeira tentativa: manter `filters` com os UUIDs conhecidos (melhor UX, mostra apenas impressoras)
- Se falhar com erro de filtro: segunda tentativa com `acceptAllDevices: true` (mostra todos dispositivos BT, mas funciona com qualquer impressora)

### `connectToDevice()`
- Manter o loop atual pelos 3 UUIDs conhecidos (rapido quando bate)
- Adicionar bloco extra: se nenhum UUID conhecido funcionou, chamar `server.getPrimaryServices()` para descobrir todos os servicos
- Para cada servico descoberto, buscar caracteristicas com `write` ou `writeWithoutResponse`
- Logar o UUID do servico encontrado no console para debug futuro

### Aumentar timeout do GATT connect
- Subir de 8s para 10s — impressoras genericas podem ser mais lentas na negociacao

### Adicionar mais UUIDs conhecidos
- `"0000ff00-0000-1000-8000-00805f9b34fb"` — usado por muitas impressoras chinesas (tipo Goojprt, PeriPage)
- `"0000fee7-0000-1000-8000-00805f9b34fb"` — outro UUID comum em termicas genericas

## Fluxo apos a mudanca

```text
Parear -> Filtro UUID -> Falhou? -> acceptAllDevices
                |                         |
                v                         v
         Conectar GATT              Conectar GATT
                |                         |
                v                         v
      Tentar UUIDs conhecidos (5)   Tentar UUIDs conhecidos (5)
                |                         |
           Encontrou? ----Nao----> getPrimaryServices() (todos)
                |                         |
               Sim                  Iterar servicos
                |                         |
                v                         v
         Enviar dados            Encontrou writable? -> Enviar
```

## Impacto
Mudanca apenas em `src/lib/bluetoothPrinter.ts` (modulo compartilhado). Automaticamente vale para KitchenTab, KitchenPage, DashboardPage e qualquer outro consumidor.
