
# Corrigir URL pública no painel do lojista

## Problema

Na aba "Perfil da Loja" do dashboard, o link exibido como "URL pública da sua lanchonete" é gerado com `window.location.origin`, que retorna a URL do ambiente atual (preview ou produção). Quando o lojista acessa o painel pelo link de preview (`lovableproject.com`), o link gerado fica:

```
https://4930409c-277c-4049-bcfe-e466bb996cff.lovableproject.com/unidade/burguer-do-rei
```

...que exige login da Lovable para acessar. O link correto deveria ser sempre:

```
https://snack-hive.lovable.app/unidade/burguer-do-rei
```

## Solução

Substituir `window.location.origin` pelo domínio oficial fixo publicado.

### Arquivo: `src/components/dashboard/StoreProfileTab.tsx`

**Linha 41 — antes:**
```tsx
const publicUrl = `${window.location.origin}/unidade/${form.slug}`;
```

**Depois:**
```tsx
const PUBLIC_BASE_URL = "https://snack-hive.lovable.app";
const publicUrl = `${PUBLIC_BASE_URL}/unidade/${form.slug}`;
```

## Por que isso resolve

- O link exibido e copiado pelo lojista sempre apontará para o site publicado correto.
- Funciona independentemente de o lojista estar acessando o painel pelo preview ou pelo site publicado.
- Nenhuma outra parte do sistema usa esse URL gerado — é apenas para exibição e cópia.

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `src/components/dashboard/StoreProfileTab.tsx` | Substituir `window.location.origin` pelo domínio publicado fixo |
