
# Adicionar banner na página pública (acima da barra de pesquisa)

## Resumo
Permitir que o dono da loja faça upload de uma imagem de banner que será exibida na vitrine pública, entre o header e a barra de pesquisa sticky. O banner será gerenciado no painel (aba Perfil da Loja).

## Como vai funcionar
- Na página pública, uma imagem de banner aparece logo abaixo do header e acima da barra de pesquisa
- O banner ocupa a largura total do conteúdo, com cantos arredondados e proporção paisagem (16:9 ou similar)
- Se não houver banner configurado, nada é exibido (sem espaço vazio)
- No dashboard (Perfil da Loja), o dono pode fazer upload ou remover o banner

## Mudanças técnicas

### 1. Banco de dados
- Adicionar coluna `banner_url` (text, nullable) na tabela `organizations`

### 2. `src/components/dashboard/StoreProfileTab.tsx`
- Adicionar campo de upload de banner (similar ao upload de logo já existente)
- Ao selecionar imagem, fazer upload para o storage bucket `menu-images` (ou criar bucket `banners`) no caminho `banners/{org_id}.{ext}`
- Salvar a URL pública no campo `banner_url` da organização
- Botão para remover o banner

### 3. `src/pages/UnitPage.tsx`
- Entre o `</header>` e a barra de pesquisa sticky, renderizar a imagem do banner se `org.banner_url` existir
- Estilo: `max-w-2xl mx-auto px-4 pt-3` com imagem `rounded-2xl w-full object-cover` e altura máxima (~180px)

### 4. `src/hooks/useOrganization.ts`
- Incluir `banner_url` no select da query (se não estiver usando `*`)

### 5. Tipos
- Adicionar `banner_url` na interface `Organization` do `StoreProfileTab` e onde mais for necessário
