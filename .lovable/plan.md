

## Criar aba dedicada "Impressora Térmica" no dashboard

### O que muda

Todo o conteúdo relacionado a impressora que hoje está espalhado dentro de "Configurações" será movido para uma nova aba própria chamada **"Impressora Térmica"** no menu lateral, deixando as Configurações mais limpas e organizadas.

### Mudanças

#### 1. Novo arquivo: `src/components/dashboard/PrinterTab.tsx`

Criar um componente dedicado contendo todas as seções de impressora que hoje estão no SettingsTab:

- Modo de impressão (browser / desktop / bluetooth)
- Pareamento Bluetooth (botão parear, status, desconectar)
- Largura da impressora (58mm / 80mm)
- Configuração de impressão (ID da loja, copiar, testar impressora, baixar trendfood.exe)

O componente recebe as mesmas props de Bluetooth que o SettingsTab recebe hoje.

#### 2. `src/components/dashboard/SettingsTab.tsx`

Remover as duas seções de impressora:
- Seção "IMPRESSORA" (modo, Bluetooth, largura)
- Seção "CONFIGURAÇÃO DE IMPRESSÃO" (ID da loja, teste, download)

O SettingsTab fica apenas com: Informações da conta, Assinatura, Indique o TrendFood, Alterar senha, Zona de Perigo.

#### 3. `src/pages/DashboardPage.tsx`

- Adicionar `"printer"` ao tipo `TabKey`
- Importar o novo `PrinterTab`
- Adicionar a aba "Impressora Térmica" no array `navItemsBottom` (com icone de Printer), logo antes de "Configurações"
- Remover o link externo "Impressora Térmica" que hoje está no rodapé da sidebar (pois agora é uma aba interna)
- Renderizar `<PrinterTab ... />` quando `activeTab === "printer"`
- Remover as props de Bluetooth do `<SettingsTab>` (já que elas vão para o PrinterTab)

### Resultado

O menu lateral ficará assim na seção inferior:
- Funcionalidades
- Como Usar
- Perfil da Loja
- **Impressora Térmica** (nova aba dedicada)
- Configurações

### Detalhes técnicos

O `PrinterTab` receberá estas props:
```typescript
interface PrinterTabProps {
  btDevice: BluetoothDevice | null;
  btConnected: boolean;
  onPairBluetooth: () => void;
  onDisconnectBluetooth: () => void;
  btSupported: boolean;
}
```

O `SettingsTab` terá suas props simplificadas (sem Bluetooth) e perderá ~150 linhas de código relacionado a impressora.
