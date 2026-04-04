

## Plano: Corrigir bug que sobrescreve endereço de outras lojas

### Problema identificado
No `StoreProfileTab.tsx`, o campo `store_address` está incluído no objeto `sharedFields` (linha 167). Esse objeto é usado na função `updateAllOrgs()` (linha 191) que atualiza **TODAS as outras lojas do mesmo dono** com os mesmos valores.

Resultado: quando o dono salva qualquer coisa no perfil da Loja A, o endereço da Loja A é copiado para Loja B, Loja C, etc. Com o auto-save de 1.5s, basta editar qualquer campo para isso acontecer.

### Correção
Remover `store_address` e `delivery_config` do `sharedFields` -- esses campos são **específicos de cada loja**, não compartilhados.

Campos que fazem sentido compartilhar entre lojas do mesmo dono:
- emoji, primary_color, whatsapp, pix_key, pix_confirmation_mode, business_hours -- OK

Campos que NÃO devem ser compartilhados:
- **store_address** -- cada loja tem seu endereço
- **delivery_config** -- cada loja pode ter raio/taxa diferente

### Implementação
- 1 arquivo editado: `src/components/dashboard/StoreProfileTab.tsx`
- Mover `store_address` e `delivery_config` de `sharedFields` para o update individual da loja atual (linhas 171-179)
- O `sharedFields` fica sem esses dois campos, então `updateAllOrgs` não sobrescreve mais

### Código (antes → depois)

**Antes (linha 160-169):**
```typescript
const sharedFields = {
  emoji, primary_color, whatsapp, pix_key,
  pix_confirmation_mode, business_hours,
  store_address: buildStoreAddress(addressFields) || null,  // ← BUG
  delivery_config: { free_above: freeAbove },               // ← BUG
};
```

**Depois:**
```typescript
const sharedFields = {
  emoji, primary_color, whatsapp, pix_key,
  pix_confirmation_mode, business_hours,
};

// Campos específicos da loja (NÃO compartilhar)
const orgSpecificFields = {
  store_address: buildStoreAddress(addressFields) || null,
  delivery_config: { free_above: freeAbove },
};
```

E o update individual inclui ambos:
```typescript
.update({ name, description, slug, ...sharedFields, ...orgSpecificFields })
```

### Impacto
- Zero mudanças no banco de dados
- Corrige o bug que apaga endereços de outras lojas
- Não afeta lojas com uma única unidade

