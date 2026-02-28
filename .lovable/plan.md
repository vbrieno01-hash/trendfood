

# Plano: Aba "Conectar WhatsApp" no painel Admin

## Resumo

Adicionar uma nova aba "WhatsApp" no painel Admin com um botão "Gerar QR Code" que simula uma chamada de API e exibe um placeholder de QR Code.

## Alterações

### 1) Novo componente `src/components/admin/WhatsAppConnectTab.tsx`

Componente com:
- Card com título "Conectar WhatsApp" e descrição
- Botão "Gerar QR Code" que ao clicar mostra estado de loading (1.5s simulado) e depois exibe um placeholder de imagem (256x256) representando o QR Code
- Usa `Card`, `Button`, `Skeleton` do design system existente
- Ícones do Lucide (`QrCode`, `Smartphone`, `CheckCircle2`)

### 2) Editar `src/pages/AdminPage.tsx`

- Adicionar `"whatsapp"` ao type `AdminTab`
- Adicionar item no array `navItems` com ícone `Smartphone` e label "WhatsApp"
- Importar e renderizar `WhatsAppConnectTab` quando `activeTab === "whatsapp"`

## Arquivos

```
CREATE: src/components/admin/WhatsAppConnectTab.tsx
EDIT:   src/pages/AdminPage.tsx (type, navItems, render)
```

