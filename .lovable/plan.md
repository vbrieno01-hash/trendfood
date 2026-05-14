## Problema

O arquivo hospedado em `downloads/ifood-homologacao-trendfood.pdf` está corrompido — só tem **9 bytes** (deveria ter ~50-100KB). Por isso o navegador do analista do iFood mostra "Falha ao carregar documento PDF".

A causa foi o upload anterior ter enviado um placeholder em vez do binário real do PDF.

## Plano

1. **Regerar o PDF** localmente com `reportlab` a partir de `docs/IFOOD-HOMOLOGACAO.md` (3 páginas, capa vermelha iFood `#EA1D2C`, mesmo layout aprovado antes).
2. **Validar localmente** convertendo para imagens com `pdftoppm` e inspecionando cada página (sem cortes, fontes ok, tabelas íntegras).
3. **Reenviar via `supabase--storage_upload`** para o bucket público `downloads`, sobrescrevendo o arquivo quebrado, com o caminho `ifood-homologacao-trendfood.pdf`.
4. **Verificar com `curl -I`** se o `content-length` agora bate com o tamanho real do arquivo (não 9 bytes) e se abre no navegador.
5. **Devolver o link final** já testado para você colar na resposta ao iFood:
   `https://xrzudhylpphnzousilye.supabase.co/storage/v1/object/public/downloads/ifood-homologacao-trendfood.pdf`

## Observações

- Nenhuma alteração de código do app.
- Nenhuma migration.
- Apenas geração de artefato + upload para storage.
