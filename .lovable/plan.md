

## Diagnóstico: Banners desaparecidos

### O que aconteceu
Os **arquivos de banner foram deletados do storage** (pasta `banners/` no bucket `menu-images` está completamente vazia), mas as URLs continuam salvas na coluna `banner_url` da tabela `organizations`. Resultado: todas as lojas com banner configurado mostram uma imagem quebrada (ícone 🖼️).

**Lojas afetadas:** 5 organizações têm `banner_url` preenchido, mas todas as imagens retornam 404.

### Plano de correção

**1. Limpar referências órfãs no banco** (imediato)
- Executar uma migração SQL para setar `banner_url = NULL` em todas as organizações cujo banner não existe mais no storage
- Isso remove o ícone de imagem quebrada instantaneamente

**2. Adicionar tratamento de erro na `<img>` do banner** (preventivo)
- No `UnitPage.tsx`, adicionar `onError` na tag `<img>` do banner para esconder a imagem caso a URL retorne erro
- Isso evita que, no futuro, qualquer banner com URL inválida quebre a experiência

### Arquivos modificados
| Arquivo / Recurso | Mudança |
|---|---|
| Migração SQL | `UPDATE organizations SET banner_url = NULL WHERE banner_url IS NOT NULL` |
| `src/pages/UnitPage.tsx` | Adicionar `onError` handler na `<img>` do banner para esconder se falhar |

### Resultado
- Lojas param de exibir imagem quebrada imediatamente
- Lojistas podem re-fazer o upload do banner normalmente pelo painel
- Futuros erros de imagem são tratados graciosamente

