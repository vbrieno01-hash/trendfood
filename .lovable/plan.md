
# Simplificar distribuicao do APK e EXE

## Problema atual

Os downloads do APK e EXE dependem da API do GitHub Releases, que exige:
- Manter um repositorio GitHub publico com releases
- Fazer build do APK manualmente (processo complicado com JDK, Gradle, etc.)
- A API do GitHub pode falhar ou ter rate limit

## Solucao proposta: Upload direto pelo dashboard

Permitir que voce faca upload dos arquivos APK e EXE diretamente pelo painel do TrendFood, sem depender do GitHub. Os arquivos ficam armazenados no backend (storage) e os clientes baixam por um link direto.

### Como vai funcionar

1. Na aba "Impressora", a secao de Downloads vai ter um botao "Enviar arquivo" para cada tipo (APK e EXE)
2. Voce seleciona o arquivo do seu computador e ele e enviado para o storage do backend
3. O link de download e gerado automaticamente e fica disponivel para os clientes
4. Pode atualizar o arquivo a qualquer momento, enviando uma nova versao

### Beneficios

- Sem depender do GitHub, sem build complicado
- Upload simples direto do navegador
- Pode usar APKs gerados por qualquer metodo (Android Studio, servico online, etc.)
- Links de download sempre funcionam

## Detalhes tecnicos

### 1. Criar bucket de storage "downloads"

- Bucket publico para permitir downloads sem autenticacao
- Politica de upload restrita ao dono da organizacao

### 2. Adicionar colunas na tabela `organizations`

- `apk_url` (text, nullable) - URL do APK armazenado
- `exe_url` (text, nullable) - URL do EXE armazenado

### 3. Atualizar `PrinterTab.tsx`

- Remover toda a logica de busca via GitHub API (`findAssetUrl`)
- Adicionar componente de upload de arquivo para APK e EXE
- Botao de download aponta direto para a URL salva no banco
- Manter a mesma interface visual, apenas trocando o mecanismo

### 4. Criar pagina publica de download (opcional)

- Rota `/download` acessivel sem login
- Mostra botoes de download do APK e EXE da organizacao
- Link compartilhavel para enviar aos clientes

### Fluxo simplificado

```text
Voce (admin)                     Cliente
    |                                |
    |-- Upload APK pelo painel -->   |
    |                                |
    |   [Arquivo salvo no storage]   |
    |                                |
    |-- Compartilha link ----------> |
    |                                |-- Clica e baixa o APK
```
