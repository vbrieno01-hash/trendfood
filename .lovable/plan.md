

# Corrigir banner e aplicar atualizacoes em todas as lojas

## Problema 1: Banner nao salva
O campo `banner_url` nao esta incluido na query de busca das organizacoes no `useAuth.tsx` (linha 77). Quando o banner e salvo no banco de dados (funciona - status 204), ao chamar `refreshOrganization()` o dado volta sem o `banner_url`, entao a interface mostra como se nao tivesse sido salvo.

**Tambem falta**: `printer_width` na mesma query.

### Correcao
- Adicionar `banner_url` e `printer_width` no `.select()` do `fetchOrganization` em `src/hooks/useAuth.tsx` (linha 77)
- Adicionar `banner_url` e `printer_width` na interface `Organization` do mesmo arquivo

## Problema 2: Atualizar todas as lojas de uma vez
Quando voce salva o perfil, o sistema atualiza apenas a loja atual (`.eq("id", organization.id)`). Para que a atualizacao se aplique a todas as suas lojas:

### Correcao
- No `handleSave` do `StoreProfileTab.tsx`, apos salvar a loja atual, buscar todas as organizacoes do usuario e atualizar os campos compartilhados (banner, cor, horario, endereco, configuracao de entrega, pix, whatsapp) em todas elas
- O `handleBannerUpload` e `handleRemoveBanner` tambem serao alterados para aplicar o `banner_url` em todas as organizacoes do usuario
- O `handleLogoUpload` e `handleRemoveLogo` idem

### Campos que serao replicados para todas as lojas
- `banner_url`, `logo_url`, `primary_color`, `emoji`
- `whatsapp`, `pix_key`, `pix_confirmation_mode`
- `business_hours`, `store_address`, `delivery_config`

### Campos que permanecem individuais por loja
- `name`, `slug`, `description` (cada loja tem identidade propria)

## Arquivos a alterar
1. **`src/hooks/useAuth.tsx`** - Adicionar `banner_url` e `printer_width` na query e na interface
2. **`src/components/dashboard/StoreProfileTab.tsx`** - No `handleSave`, fazer update em todas as orgs do usuario para os campos compartilhados. Mesmo para banner/logo upload/remove.

