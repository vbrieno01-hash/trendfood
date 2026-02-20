

# Usar a logo oficial (coroa vermelha) como marca d'agua no relatorio

## Resumo

Salvar a logo oficial do TrendFood (circulo vermelho com coroa) enviada pelo usuario e garantir que ela seja usada como marca d'agua no relatorio de vendas.

## Mudancas

### 1. Copiar a logo para o projeto

Copiar a imagem enviada (`user-uploads://1771601978143.png`) para `public/logo-trendfood.png`, substituindo o arquivo atual. Assim o codigo existente que ja referencia `/logo-trendfood.png` funcionara automaticamente com a logo oficial correta.

### 2. Nenhuma alteracao de codigo necessaria

O `ReportsTab.tsx` ja usa `window.location.origin + "/logo-trendfood.png"` como marca d'agua. Basta substituir o arquivo da imagem.

