

## Temas Personalizados por Loja

### Situação atual
A loja já possui `primary_color`, `logo_url` e `banner_url` na tabela `organizations`. A cor primária é aplicada como CSS variable `--org-primary` na UnitPage e usada inline em botões/pills. Não há suporte a cor secundária, estilo de botão, ou fontes customizáveis.

### O que será implementado

**1. Nova coluna `theme_config` (JSONB) na tabela `organizations`**
Armazena todas as opções visuais extras:
```json
{
  "secondary_color": "#1e293b",
  "header_style": "solid" | "transparent" | "gradient",
  "button_style": "rounded" | "pill" | "square",
  "card_style": "flat" | "shadow" | "bordered",
  "font": "default" | "modern" | "classic" | "playful"
}
```
Todos opcionais com fallbacks sensatos — nenhuma loja existente quebra.

**2. Editor de tema no StoreProfileTab**
Nova seção "Tema Visual" abaixo da cor primária existente, com:
- Color picker para cor secundária (usada em textos de destaque, badges)
- Seletor de estilo de header (sólido/transparente/gradiente)
- Seletor de estilo de botão com preview ao vivo (arredondado/pill/quadrado)
- Seletor de estilo de card (flat/sombra/bordado)
- Seletor de fonte (4 opções com Google Fonts)
- Preview em tempo real reutilizando o mini-preview que já existe

**3. Aplicação do tema na UnitPage (página pública)**
- CSS variables extras: `--org-secondary`, aplicadas via `useEffect`
- Header renderizado conforme `header_style`
- Botões e pills com `border-radius` dinâmico conforme `button_style`
- Cards de menu com estilo conforme `card_style`
- Google Font carregada dinamicamente via `<link>` no `<head>`

**4. Atualização do tipo Organization**
Adicionar `theme_config` ao `useOrganization.ts` e ao `AdminStoreManager`.

### Arquivos modificados
- **Migration**: nova coluna `theme_config jsonb default '{}'` em `organizations`
- `src/hooks/useOrganization.ts` — tipo `ThemeConfig`, campo no `Organization`
- `src/components/dashboard/StoreProfileTab.tsx` — seção editor de tema
- `src/pages/UnitPage.tsx` — aplicar CSS vars e estilos dinâmicos
- `src/components/admin/AdminStoreManager.tsx` — incluir `theme_config` no cast

### O que NÃO muda
- A `primary_color` existente continua funcionando igual
- Lojas sem `theme_config` usam os defaults atuais (zero breaking changes)
- Nenhuma tabela nova, apenas uma coluna JSONB

