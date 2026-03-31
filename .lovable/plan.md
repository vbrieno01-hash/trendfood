

## Plano: Reverter links para o formato original (sem OG dinâmico)

### O que será feito

Reverter os 3 arquivos que foram alterados para usar `getShareableStoreUrl`, voltando ao link direto `https://trendfood.lovable.app/unidade/slug`:

**1. `src/components/dashboard/StoreProfileTab.tsx`**
- Remover import de `getShareableStoreUrl`
- Remover variável `shareableUrl`
- No `handleCopyLink`, copiar `publicUrl` em vez de `shareableUrl`

**2. `src/pages/CourierPage.tsx`**
- Remover import de `getShareableStoreUrl`
- Na mensagem WhatsApp, trocar `getShareableStoreUrl(orgSlug)` por `https://trendfood.lovable.app/unidade/${orgSlug}`

**3. Limpar arquivos do OG (opcional)**
- `src/lib/shareUrl.ts` e `supabase/functions/og-share/index.ts` podem ser esvaziados/removidos já que não serão mais usados

### Resultado
Todos os botões "Copiar link" voltam a copiar o link direto da loja, como estava antes.

