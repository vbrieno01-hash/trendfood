
# Reorganizar a aba Impressora Termica com secao de Downloads

## Resumo

Criar uma nova secao "Downloads" separada visualmente das outras, agrupando os botoes de download do APK e do EXE em um unico card bonito. Atualmente os downloads estao espalhados (APK dentro do bloco Bluetooth, EXE dentro da config Desktop). A ideia e centralizar tudo em um card proprio com icone de Download no header.

## Layout proposto

A aba ficara com 4 cards separados, nesta ordem:

1. **Impressora** -- modo de impressao, Bluetooth, largura do papel (como esta hoje, mas sem o botao de download do APK)
2. **Downloads** -- novo card agrupando APK e EXE lado a lado ou empilhados, com descricao curta de cada
3. **Configuracao Desktop** -- ID da loja, teste de impressora (sem o botao de download do EXE, que vai pro card acima)
4. **Comanda** -- editor do cabecalho + preview (sem mudanca)

## Detalhes tecnicos

### Arquivo: `src/components/dashboard/PrinterTab.tsx`

1. **Remover** o botao "Baixar TrendFood.apk" e seu paragrafo de dentro do bloco Bluetooth (linhas 260-272)

2. **Remover** o botao "Baixar trendfood.exe" e seu paragrafo de dentro do bloco Desktop (linhas 401-413)

3. **Criar** um novo card "Downloads" entre o card "Impressora" e o card "Configuracao Desktop", seguindo o mesmo padrao visual dos outros cards (rounded-xl, border, header com bg-secondary/30). O header usara o icone `Download` com o titulo "DOWNLOADS". Dentro, dois sub-blocos lado a lado ou empilhados:
   - **App Android (APK)** -- icone Smartphone, botao de download, descricao curta
   - **Programa Desktop (EXE)** -- icone Monitor, botao de download, descricao curta

   Cada sub-bloco sera um mini-card com borda (rounded-lg border p-3), similar ao estilo ja usado no bloco Bluetooth.

Nenhum arquivo novo sera criado. Apenas reorganizacao dentro do mesmo componente.
