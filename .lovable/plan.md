

## QR Code do Cardápio para impressão

Criar uma seção no **StoreProfileTab** (aba "Minha Loja" do dashboard) que exibe o QR Code da loja com opção de download/impressão.

### O que será feito

**1. Seção "QR Code do Cardápio"** em `src/components/dashboard/StoreProfileTab.tsx`

- Adicionar ao final do formulário uma seção com:
  - QR Code SVG apontando para `https://trendfood.lovable.app/unidade/{slug}`
  - Nome da loja + emoji acima do QR
  - Texto "Escaneie para ver o cardápio" abaixo
  - Botão "Baixar QR Code" que gera um PNG via canvas e faz download
  - Botão "Imprimir" que abre `window.print()` com apenas o QR visível

- Usar `QRCodeSVG` de `qrcode.react` (já instalado e usado em outros componentes)
- O layout do QR será estilizado como um "cartão" imprimível (fundo branco, bordas, logo)

### Arquivos

1. `src/components/dashboard/StoreProfileTab.tsx` — adicionar seção QR Code com download e impressão

