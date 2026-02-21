

# Adicionar seção Bluetooth na documentação da impressora térmica

## Resumo

A página de documentação `/docs/impressora-termica` já existe e é bem completa para impressoras USB/rede de 80mm. O plano é expandir essa mesma página para incluir uma nova seção dedicada a impressoras Bluetooth (58mm portáteis), com instruções de pareamento por plataforma e troubleshooting específico.

## Mudanças no arquivo `src/pages/DocsTerminalPage.tsx`

### 1. Atualizar o título/hero

Mudar de "Impressora Térmica 80mm" para "Impressora Térmica" (genérico), e ajustar a descrição para mencionar suporte a 58mm e 80mm, USB, rede e Bluetooth.

### 2. Nova seção: "Conectar impressora Bluetooth (58mm)"

Inserir após a seção "Passo a passo de configuração" (seção 3) uma nova seção com:

- Explicação de que impressoras Bluetooth 58mm funcionam no Android (Chrome) e no Windows, mas nao no iOS (Safari)
- Passo a passo com os componentes StepBadge já existentes:
  1. Parear a impressora no celular/PC (Configurações > Bluetooth > buscar "MobilePrinter" ou nome similar, PIN comum: 0000 ou 1234)
  2. No dashboard, ir em Configurações e selecionar "58mm (portátil)" na largura da impressora
  3. Abrir a tela da Cozinha no Chrome, clicar em imprimir um pedido, e selecionar a impressora Bluetooth no diálogo
  4. Testar com um pedido real

- Sub-seção com cards por plataforma (mesmo estilo dos cards Windows/macOS/Linux já existentes):
  - Android: Configurações > Bluetooth > Parear > Chrome seleciona automaticamente
  - Windows: Configurações > Bluetooth > Adicionar dispositivo > Aparece em Dispositivos e Impressoras
  - iOS: Card com aviso de incompatibilidade (AirPrint nao suporta impressoras genéricas Bluetooth)

### 3. Atualizar seção de Requisitos

Adicionar um quarto card na grid de requisitos:
- Titulo: "Bluetooth (58mm)"
- Itens: Impressora térmica 58mm Bluetooth, Android ou Windows, Chrome (recomendado), Papel 58mm

### 4. Novos TroubleCards na seção de problemas

Adicionar 2 cards de troubleshooting Bluetooth:
- "Impressora Bluetooth não aparece no pareamento" → Solução: verificar se está ligada e em modo pareamento, tentar PIN 0000 ou 1234
- "Impressão Bluetooth sai cortada ou com layout errado" → Solução: verificar se a largura está configurada como 58mm nas Configurações do dashboard

### 5. Atualizar seção de impressoras recomendadas

Adicionar 2 modelos Bluetooth 58mm na lista:
- Mini impressora térmica 58mm Bluetooth (genérica) — ~R$80-150
- Leopardo A8 58mm Bluetooth — ~R$100-200

### 6. Atualizar o GuideTab

No arquivo `src/components/dashboard/GuideTab.tsx`, na seção "Configurações" (id: "settings"), adicionar um step mencionando a configuração da largura da impressora (58mm ou 80mm).

## Nenhuma mudança no banco de dados

Todas as alterações são apenas de interface/documentação.

