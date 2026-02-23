

# Upload global de APK/EXE pelo painel Admin

## O que muda

Atualmente o upload de APK e EXE esta na aba "Impressora" do dashboard de cada loja, salvo por organizacao. Vamos transformar isso em uma configuracao **global da plataforma**, gerenciada exclusivamente pelo admin.

## Como vai funcionar

1. O admin faz upload do APK e EXE na aba **Configuracoes** do painel `/admin`
2. Os arquivos ficam salvos no storage em um caminho global (ex: `global/trendfood.apk`)
3. As URLs sao salvas na tabela `platform_config` (que ja existe como singleton)
4. Na aba Impressora do dashboard das lojas, os botoes de download apontam para esses arquivos globais (somente download, sem upload)

## Detalhes tecnicos

### 1. Adicionar colunas `apk_url` e `exe_url` na tabela `platform_config`
- Duas colunas text nullable
- A tabela ja tem RLS de update restrita ao admin

### 2. Atualizar storage policy do bucket `downloads`
- Adicionar politica de upload para o caminho `global/` restrita a admins (usando `has_role`)
- Manter as politicas existentes por organizacao

### 3. Criar componente `AdminDownloadsSection`
- Componente com upload de APK e EXE, similar ao que ja existe no PrinterTab
- Upload salva em `downloads/global/trendfood.apk` e `downloads/global/trendfood.exe`
- Atualiza `platform_config` com as URLs publicas
- Renderizado dentro da aba "Configuracoes" do AdminPage

### 4. Atualizar `PrinterTab.tsx`
- Remover a logica de upload (botoes "Enviar APK/EXE")
- Buscar as URLs globais da `platform_config` em vez de `organization.apk_url`
- Manter apenas os botoes de download

### 5. Limpar colunas `apk_url` e `exe_url` da tabela `organizations`
- Remover essas colunas ja que agora sao globais (opcional, pode manter sem uso)

### Arquivos afetados
- `supabase/migrations/` - nova migration (colunas + storage policy)
- `src/components/admin/AdminDownloadsSection.tsx` - novo componente
- `src/pages/AdminPage.tsx` - importar e renderizar na aba config
- `src/components/dashboard/PrinterTab.tsx` - trocar upload por download global
