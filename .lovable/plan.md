

## Diagnóstico — sim, está acontecendo com várias lojas

Investigando o storage e o banco, descobri o seguinte:

- **6 lojas** têm `banner_url` salvo no banco
- Mas só **2 arquivos** existem fisicamente no storage
- As outras **4 lojas (incluindo a TrendFood)** apontam para um arquivo que **não existe mais** → quando a vitrine tenta carregar, retorna **HTTP 400** e a tag `<img>` simplesmente não renderiza (ou exibe quebrada). Por isso "não fica".

### Causa raiz — bug em `DeleteUnitDialog.tsx`

Quando qualquer pessoa apaga uma unidade pelo dashboard, esse código roda (linhas 81-93):

```ts
clearStorageBucket("menu-images", `banners`).then(...)
```

E `clearStorageBucket` faz:

```ts
list("banners")  // lista TODOS os banners de TODAS as lojas
remove(...)      // apaga TODOS
```

Ou seja, **apagar 1 loja zera os arquivos de banner de TODAS as lojas do sistema**. O `banner_url` no banco continua salvo, então no dashboard o lojista vê a URL preenchida (e o preview dele funciona durante a sessão por causa do estado React), mas na vitrine pública o arquivo não existe mais → banner some.

### Causa secundária — escrita "compartilhada" entre lojas do mesmo dono

Em `StoreProfileTab.handleBannerUpload` (linha 358):

```ts
await updateAllOrgs({ banner_url: url });
```

Isso copia a mesma `banner_url` para TODAS as outras unidades do mesmo dono. Faz sentido para Enterprise multi-loja, mas piora o efeito do bug acima: quando o storage é zerado, todas as filiais ficam com URL morta de uma vez.

## Plano de correção

### 1. Corrigir o `DeleteUnitDialog.tsx`
Substituir a chamada destrutiva por uma versão que apaga **apenas** os banners da loja sendo excluída:

- remover o `clearStorageBucket("menu-images", "banners")` (que apaga tudo)
- manter só o filtro `f.name.startsWith(orgId)` que já existe no `.then`
- aplicar a mesma proteção pra `menu-images/{orgId}` (já é seguro porque usa o `orgId` como prefixo)

### 2. Reparar os bancos das lojas atualmente quebradas
Migration que faz `UPDATE organizations SET banner_url = NULL` para os 4 registros cujo arquivo não existe mais no storage. Isso limpa o "fantasma" e o lojista pode subir o banner de novo sem confusão.

Lojas afetadas hoje:
- TrendFood (`mcd`)
- Chapa e Alho (`chapa-e-alho`)
- Sabor na chapa (`sabor-na-chapa`)
- Rei do Burguer (`rei-do-burguer`)

### 3. Validar a renderização da vitrine
Adicionar `onError` no `<img>` do banner em `UnitPage.tsx` para esconder o elemento se a imagem falhar (defesa em profundidade — se algum bug residual deixar URL morta no futuro, a loja não fica com placeholder quebrado).

## Arquivos afetados

- `src/components/dashboard/DeleteUnitDialog.tsx` — corrigir limpeza de storage
- `src/pages/UnitPage.tsx` — `onError` no `<img>` do banner
- migration SQL — limpar `banner_url` das 4 lojas com arquivo ausente

## Resultado esperado

- Apagar uma unidade nunca mais derruba banner de outras lojas
- As 4 lojas afetadas agora podem subir banner normalmente (sem o "fantasma" no banco)
- Se algo der errado no futuro, a vitrine não exibe imagem quebrada — só não mostra o banner

