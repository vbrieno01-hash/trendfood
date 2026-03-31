

## Plano: CMS Admin — Editar Conteúdo Sem Gastar Créditos

### Situação Atual
Quase todo o conteúdo do TrendFood está **hardcoded** nos arquivos:
- **Página inicial** (Index.tsx): títulos, textos, imagens, features, badges, problemas — tudo fixo no código
- **Admin configs**: lista de funcionalidades hardcoded, número de WhatsApp repetido em 3 arquivos
- **Configurações da plataforma**: só tem taxas de entrega editáveis

### O que vamos criar

**Uma nova aba "Site & Conteúdo" no Admin** com seções editáveis:

#### 1. Configurações Gerais da Plataforma
- WhatsApp de suporte (atualmente hardcoded em 3 lugares)
- Dias de trial padrão
- Texto do contador de pedidos
- Toggle da promoção de 50%

#### 2. Editor do Hero da Landing Page
- Título principal e subtítulo
- Texto do botão CTA
- URL da imagem de fundo
- Badges de prova social (ex: "0% comissão", "PIX integrado")

#### 3. Editor de Seções da Landing Page
- Cards de benefícios (título + descrição)
- Cards de problemas (título + descrição + imagem)
- Lista de features/recursos (título + descrição)

### Implementação Técnica

**Tabela nova: `platform_content`**
```sql
CREATE TABLE platform_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,       -- ex: 'hero_title', 'support_whatsapp'
  value JSONB NOT NULL,           -- texto, array, objeto
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
- RLS: leitura pública (landing page precisa ler), escrita só admin
- Seed com valores atuais do código

**Arquivos modificados:**
| Arquivo | Mudança |
|---------|---------|
| `src/pages/AdminPage.tsx` | Nova aba "Site" no menu |
| `src/components/admin/SiteContentTab.tsx` | **Criar** — formulários para editar cada seção |
| `src/hooks/usePlatformContent.ts` | **Criar** — hook para ler/salvar conteúdo |
| `src/pages/Index.tsx` | Carregar textos do banco em vez de hardcoded |
| `src/pages/DashboardPage.tsx` | Ler WhatsApp do banco |
| `src/pages/DocsTerminalPage.tsx` | Ler WhatsApp do banco |
| Migração SQL | Criar tabela + seed + RLS |

**Fluxo:**
```text
Admin edita texto no painel
       ↓
Salva no platform_content (banco)
       ↓
Landing page carrega do banco
       ↓
Visitante vê conteúdo atualizado
```

### O que você ganha
- Mudar textos da página inicial sem mexer no código
- Mudar número de WhatsApp em um só lugar
- Mudar imagens e badges sem créditos
- Tudo centralizado no painel admin

