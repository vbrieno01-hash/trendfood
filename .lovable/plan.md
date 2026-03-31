

## Plano: CMS 100% Editável com Upload de Imagens

### Problema Atual
O `SiteContentTab` só permite editar textos via URL. Faltam:
1. **Upload de imagens** — hoje é só colar URL, sem poder subir arquivo
2. **Seções inteiras ainda hardcoded** no `Index.tsx`:
   - Cards de problemas (3 cards com imagem + título + descrição)
   - Cards de benefícios (3 cards com título + descrição)
   - Passos "Como Funciona" (4 passos com título + descrição)
   - Features/Funcionalidades (12 cards com título + descrição)
   - Comparativo TrendFood vs Marketplace (7 linhas)
   - CTA final (título + subtítulo + texto do botão)
   - Footer (links do Instagram, WhatsApp, email, textos)

### O que vamos fazer

**1. Criar bucket de storage `site-images`** para uploads do CMS

**2. Expandir o `SiteContentTab.tsx`** com:
- Componente `ImageUploader` — botão de upload que sobe para `site-images` bucket e salva a URL no `platform_content`
- Substituir o campo "URL da Imagem de Fundo" por upload real
- Novas seções editáveis:
  - **Cards de Problemas** — 3 cards com upload de imagem + título + descrição (array de objetos no `platform_content`)
  - **Cards de Benefícios** — 3 cards com título + descrição
  - **Passos "Como Funciona"** — 4 passos com título + descrição
  - **Features** — 12 cards com título + descrição (array editável)
  - **Comparativo** — linhas da tabela editáveis
  - **CTA Final** — título, subtítulo, texto do botão
  - **Footer** — links de redes sociais, email, textos

**3. Atualizar `Index.tsx`** para ler todos esses dados do CMS com fallback para os valores atuais hardcoded

**4. Atualizar `ComparisonSection.tsx`** para receber dados via props do CMS

**5. Seed dos dados atuais** — migração SQL que insere os valores hardcoded atuais na tabela `platform_content`

### Detalhes Técnicos

**Bucket de storage:**
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('site-images', 'site-images', true);
-- RLS: admin pode upload, público pode ler
```

**Componente ImageUploader:**
- Input file → compressImage → upload para `site-images/{timestamp}.webp` → salva URL pública no campo

**Estrutura dos dados no `platform_content`:**
- `problems_cards` → `[{image, title, description}, ...]`
- `benefit_cards` → `[{title, description}, ...]`
- `steps_cards` → `[{title, description}, ...]`
- `features_cards` → `[{title, description}, ...]`
- `comparison_rows` → `[{label, marketplace, trendfood, badge?}, ...]`
- `cta_title`, `cta_subtitle`, `cta_button_text`
- `footer_instagram_url`, `footer_whatsapp_url`, `footer_email`, `footer_copyright`

### Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| Migração SQL | Criar bucket `site-images` + RLS + seed dados |
| `src/components/admin/SiteContentTab.tsx` | Expandir com ImageUploader e todas as seções |
| `src/pages/Index.tsx` | Ler problems, benefits, steps, features, CTA, footer do CMS |
| `src/components/landing/ComparisonSection.tsx` | Receber rows via props do CMS |

### Resultado
Todo o conteúdo da landing page editável pelo admin, incluindo upload de imagens real — sem precisar gastar créditos no Lovable para mudar qualquer texto ou imagem.

