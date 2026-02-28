

## Plano: Gerenciar fotos do guia pelo painel admin

### Banco de dados
1. **Criar tabela `guide_screenshots`** com colunas: `id`, `section_id` (text, unique), `image_url` (text), `updated_at` (timestamp). RLS: leitura pública, escrita apenas para admins.
2. **Criar bucket de storage `guide-images`** com acesso público para leitura, escrita restrita a admins.

### Painel Admin
3. **Criar nova aba "Guia"** no `AdminPage.tsx` — lista as 13 seções do guia, cada uma com preview da imagem atual (se houver) e botão para upload/troca de screenshot.
4. **Componente `AdminGuideTab`** — para cada seção, mostra título + ícone + campo de upload de imagem. Ao fazer upload, salva no bucket `guide-images` e grava/atualiza a URL na tabela `guide_screenshots`.

### GuideTab (lado do usuário)
5. **Atualizar `GuideTab.tsx`** — buscar os registros de `guide_screenshots` ao montar o componente. Se existir imagem para a seção, exibir abaixo da descrição em um frame arredondado com sombra.

### Resultado
Você poderá fazer upload de screenshots para cada seção do guia diretamente pelo painel admin, sem precisar do Lovable.

