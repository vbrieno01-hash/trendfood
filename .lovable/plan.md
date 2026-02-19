
# Corrigir o Botão "Ver Página Pública"

## O Problema

O botão "Ver página pública" na sidebar do dashboard usa um caminho relativo:

```
href={`/unidade/${organization.slug}`}
```

Quando o lojista acessa o dashboard pelo link de preview do Lovable (que exige login), esse caminho relativo abre a página pública **dentro do mesmo ambiente de preview**, que força o login do Lovable — impedindo o cliente de ver o cardápio.

## A Solução

Trocar para o domínio de produção fixo, exatamente como já é feito no `StoreProfileTab.tsx`:

```
href={`https://snack-hive.lovable.app/unidade/${organization.slug}`}
```

Assim, independente de onde o lojista estiver acessando o dashboard (preview ou produção), o botão sempre abre a página pública real, acessível a qualquer pessoa sem login.

## Arquivo Afetado

| Arquivo | Linha | Mudança |
|---|---|---|
| `src/pages/DashboardPage.tsx` | 219 | Trocar caminho relativo `/unidade/...` pelo URL absoluto `https://snack-hive.lovable.app/unidade/...` |

Sem banco de dados, sem migrações — mudança de uma única linha.
