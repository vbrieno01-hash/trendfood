## Rodar simulação da limpeza de imagens órfãs

A função `cleanup-orphan-storage` já existe e tem flag `dry_run` no `cleanup_config`. Em dry-run, ela:

1. Lê todas as URLs referenciadas no banco (`menu_items.image_url`, `organizations.logo_url`/`banner_url`, `platform_content`).
2. Lista todos os arquivos dos buckets `menu-images`, `logos`, `site-images`, `guide-images`.
3. Considera órfão todo arquivo **não referenciado** e com **mais de 7 dias** de criado.
4. Registra cada órfão em `cleanup_logs` com `dry_run = true` — **nenhum arquivo é apagado**.

### Passos

1. Garantir que `cleanup_config` está com `enabled = true` e `dry_run = true` (consulta apenas; se já estiver assim, segue direto).
2. Chamar `cleanup-orphan-storage` via curl com o `UNIVERSAL_WEBHOOK_SECRET`.
3. Mostrar o resultado:
   - Total de imagens órfãs identificadas
   - Espaço total que seria liberado (em MB)
   - Quebra por bucket (menu-images, logos, site-images, guide-images)

### Riscos
Nenhum — modo simulação só insere linhas em `cleanup_logs`. Storage e banco de produção ficam intactos.