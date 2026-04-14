

## Melhorias de Usabilidade — Reduzir Abandono

### Problema
Clientes relatam "dificuldade" e desistem por não conseguir configurar sozinhos. A maioria trava em pontos específicos (impressora, cardápio, etc.) e não busca ajuda no guia.

### Melhorias propostas

**1. Vídeos curtos no Guia (GuideTab)**
- Adicionar links para vídeos curtos (30-60s) do YouTube/Loom em cada seção do guia
- Ex: "Como configurar a impressora", "Como adicionar itens ao cardápio"
- Implementação: campo `videoUrl` opcional em cada `GuideSection`, renderiza um botão "▶ Ver vídeo" que abre em modal ou nova aba

**2. Checklist de Setup mais visível na Home**
- O SetupChecklist já existe mas pode ser mais agressivo — mostrar como banner fixo no topo da Home enquanto não completar 100%
- Adicionar item "Configurar impressora" no checklist
- Texto mais motivacional: "Falta pouco! Complete esses passos para começar a vender"

**3. Botão "Preciso de Ajuda" flutuante no Dashboard**
- Adicionar o SupportChatWidget (que já existe na landing) também dentro do Dashboard
- Ou um botão de WhatsApp direto para suporte que abre conversa com você

**4. Tooltip de primeiro acesso em cada aba**
- Ao entrar pela primeira vez em uma aba (cardápio, impressora, mesas), mostrar um tooltip/banner rápido explicando o que fazer ali
- Usar localStorage para mostrar apenas na primeira vez

**5. Simplificar configuração da impressora**
- Adicionar botão "Testar Impressão" mais proeminente
- Mostrar diagnóstico automático (já existe `BluetoothCompatibilityDiagnostics`) de forma mais visível
- Adicionar guia passo-a-passo inline na aba Impressora

### Etapas de implementação

1. **Tornar o SetupChecklist mais visível** — banner fixo na Home com item de impressora
2. **Adicionar SupportChatWidget ao Dashboard** — mesmo widget da landing, disponível em qualquer aba
3. **Melhorar aba Impressora** — guia inline com passos numerados e botão de teste proeminente
4. **Adicionar campo de vídeo no GuideTab** — links opcionais por seção

### Escopo técnico
- Editar `HomeTab.tsx` para destacar o checklist
- Editar `SetupChecklist.tsx` para adicionar item de impressora
- Editar `DashboardPage.tsx` para incluir SupportChatWidget
- Editar `PrinterTab.tsx` para adicionar guia inline
- Editar `GuideTab.tsx` para suportar vídeos

