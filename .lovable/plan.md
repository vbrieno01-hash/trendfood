

## Substituir emoji por logo do chef no cartão QR Code

O usuário quer trocar o emoji (xícara/emoji da loja) ao lado do nome "TrendFood" no cartão do QR Code pela logo do chapéu de chef que enviou.

### Alterações

**1. Copiar a imagem para `src/assets/chef-logo.png`**

**2. `src/components/dashboard/StoreProfileTab.tsx`**
- Importar `chefLogo from "@/assets/chef-logo.png"`
- Na linha 947-949, substituir `{form.emoji} {form.name}` por uma `<img>` do chef logo (24x24px) + nome da loja
- No bloco de impressão (linha 1007), incluir a imagem inline no HTML gerado para que apareça também na versão impressa

O resultado será igual à primeira imagem enviada: logo do chapéu de chef acima do QR Code com o nome da loja.

