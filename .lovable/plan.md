
# Remover o botao "Instalar App" da sidebar

## O que sera feito

Remover o botao "Instalar App" que aparece na parte inferior da sidebar do dashboard, conforme indicado na imagem.

## Detalhes tecnicos

### Arquivo: `src/pages/DashboardPage.tsx`

Remover o bloco condicional `{!appInstalled && (...)}` que renderiza o botao "Instalar App" (linhas 822-836). Isso inclui o botao com o icone de Download e o texto "Instalar App".

Opcionalmente, variaveis relacionadas (`appInstalled`, `installPrompt`, `handleInstallApp`) podem ser mantidas caso sejam usadas em outro lugar do codigo, ou removidas se forem exclusivas desse botao -- isso sera verificado antes da implementacao.
