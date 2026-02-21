

# Adicionar aviso "Use este ID no seu programa de impressão TrendFood"

## Resumo

A secao "Configuracao de Impressao" ja existe no `SettingsTab.tsx` com o ID da loja, botao de copiar e botao de download. A unica alteracao necessaria e adicionar um aviso em destaque com o texto solicitado.

## Alteracao

### Arquivo: `src/components/dashboard/SettingsTab.tsx`

Na secao "Configuracao de Impressao" (ja existente), adicionar um bloco de destaque (fundo amarelo/amber claro) logo abaixo do campo de ID, com o texto:

**"Use este ID no seu programa de impressao TrendFood"**

Isso ficara entre o campo de ID com botao de copiar e o botao de download, usando um estilo de callout (`bg-amber-50 border border-amber-200 rounded-lg p-3`) para chamar atencao do lojista.

A instrucao existente ("Baixe o programa, abra-o e digite o ID acima...") permanece inalterada abaixo do botao de download.

