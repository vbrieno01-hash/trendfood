## Objetivo

Desligar o modo simulação da limpeza de imagens órfãs e rodar a limpeza real **uma vez**, apagando os ~112 arquivos órfãos (~13,9 MB) identificados nos buckets `menu-images`, `logos` e `site-images`.

## O que será feito

### 1. Desativar o modo simulação
Atualizar `cleanup_config` para `dry_run = false`. A partir daqui, qualquer execução da função (manual ou via pg_cron) apaga de verdade.

```sql
UPDATE public.cleanup_config SET dry_run = false, updated_at = now() WHERE id = 1;
```

### 2. Executar a limpeza uma vez (manual)
Chamar a edge function `cleanup-orphan-storage` via curl com o `UNIVERSAL_WEBHOOK_SECRET`. Ela vai:
- Varrer cada bucket (`menu-images`, `logos`, `site-images`, `guide-images`)
- Cruzar com as tabelas `menu_items.image_url`, `organizations.logo_url`, `organizations.banner_url`, `platform_content`
- Apagar só arquivos com **mais de 7 dias** que **não estão referenciados em nenhuma tabela**
- Registrar cada exclusão em `cleanup_logs` (nome, bucket, tamanho, motivo)

### 3. Mostrar relatório final
Após a execução, ler `cleanup_logs` das últimas execuções e mostrar:
- Total de arquivos apagados por bucket
- Espaço total liberado em MB
- Comparativo (antes vs depois)

## Garantias de segurança

- **Idade mínima de 7 dias** → uploads recentes nunca são tocados
- **Cruzamento com banco** → qualquer URL referenciada em produto/loja/CMS é preservada
- **Log completo** → cada exclusão fica registrada em `cleanup_logs` para auditoria
- **Buckets cobertos:** `menu-images`, `logos`, `site-images`, `guide-images` — 100% dos lugares onde o app salva imagem

## Próximos ciclos

A função já roda automaticamente via pg_cron. Com `dry_run = false`, ela vai continuar limpando órfãos novos que surgirem (produtos deletados, fotos trocadas, etc.) sem precisar de ação manual.

Se em algum momento quiser voltar pro modo simulação, é só chamar `toggle_cleanup_dry_run(true)` no painel admin ou rodar o UPDATE invertido.