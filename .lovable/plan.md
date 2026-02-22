
# Botao de parear impressora Bluetooth na aba Cozinha

## Problema
Atualmente, para parear a impressora Bluetooth, o usuario precisa ir ate a aba "Configuracoes". Na aba "Cozinha" nao existe nenhum botao para parear, o que e inconveniente pois e la que a impressao automatica acontece.

## Solucao
Adicionar um botao compacto de pareamento Bluetooth diretamente no cabecalho da aba Cozinha, ao lado dos toggles existentes ("Notificacoes" e "Imprimir automatico").

## O que sera feito

### 1. KitchenTab - Novas props e botao
- Adicionar props: `onPairBluetooth`, `btConnected`, `btSupported`
- Exibir um botao compacto no cabecalho (ao lado do toggle "Imprimir automatico") **somente quando o modo de impressao for "bluetooth"**
- O botao mostrara o status: "Parear impressora" ou o nome do dispositivo conectado (ex: "Conectada")
- Se `btSupported` for `false`, o botao ficara desabilitado

### 2. DashboardPage - Passar novas props
- Passar `onPairBluetooth`, `btConnected` e `btSupported` para o componente `KitchenTab`

## Detalhes tecnicos

No cabecalho do KitchenTab, junto aos controles existentes, sera adicionado (quando `printMode === "bluetooth"`):

```text
<Button variant="outline" size="sm" onClick={onPairBluetooth} disabled={!btSupported}>
  <Printer icon />
  {btConnected ? "Conectada" : "Parear impressora"}
</Button>
```

As novas props na interface `KitchenTabProps`:
- `onPairBluetooth?: () => void`
- `btConnected?: boolean`
- `btSupported?: boolean`

No `DashboardPage`, basta passar as mesmas funcoes e estados que ja sao passados para o `SettingsTab`.
