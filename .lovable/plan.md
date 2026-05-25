## Situação real (sem enrolação)

Os **arquivos físicos dos banners foram deletados** do storage no dia 22/05 e **não tenho como recuperar** — confirmei que a pasta `banners/` no bucket está vazia. As lojas vão precisar reenviar.

O que posso (e vou) fazer agora é **corrigir o bug que causou isso** pra nunca mais acontecer, e **avisar as lojas afetadas** com um botão fácil pra reenviar.

## Causa raiz confirmada

A função `cleanup-orphan-storage`, ao varrer o bucket `menu-images`, só considerava "em uso" os arquivos referenciados em `menu_items.image_url`. **Esqueci** que os banners também moram nesse bucket (em `banners/<org_id>.<ext>`), referenciados em `organizations.banner_url`. Resultado: marcou tudo como órfão e apagou.

## Correções (4 ações)

### 1. `supabase/functions/cleanup-orphan-storage/index.ts`
- Ao montar a lista de "referenciados", incluir `organizations.banner_url` e `logo_url` em **ambos** os buckets (`menu-images` e `logos`), não só `logos`.
- Adicionar **guarda extra**: qualquer arquivo em `banners/<uuid>.*` cujo UUID corresponda a uma org existente é automaticamente protegido, mesmo que o `banner_url` no banco esteja nulo (defesa em profundidade).
- Logar no `cleanup_logs` o resumo do que foi protegido por essa guarda, pra eu auditar.

### 2. Religar `dry_run = true` por 7 dias
- Via `toggle_cleanup_dry_run(true)`. Próximas execuções só vão **listar** o que apagariam, sem apagar. Depois de validar os logs por uma semana, volto a ligar.

### 3. `supabase/functions/cleanup-broken-banners/index.ts`
- Exigir **2 falhas HEAD consecutivas com 10s de intervalo** antes de zerar `banner_url` (evita falso positivo por instabilidade de CDN).
- Registrar em `cleanup_logs` (kind = `banner_cleared`) com a URL anterior, pra ter rastro.

### 4. Aviso no painel das lojas afetadas
- Banner discreto no topo do `HomeTab` **só** pra lojas com `banner_url IS NULL` cuja org foi criada antes de 22/05/2026:  
  *"Detectamos que o banner da sua loja foi removido por uma falha técnica nossa. Reenvie em poucos segundos."*  
  Com botão **"Reenviar banner"** que leva direto pro `StoreProfileTab` na seção de banner.
- Some sozinho quando o banner for reenviado.

## O que **não** estou prometendo

- **Não vou "restaurar" banners automaticamente** — os bytes não existem mais. Qualquer um que diga o contrário tá mentindo.
- Não vou mexer em mais nada além do que está acima nessa rodada.

Aprova pra eu aplicar?
