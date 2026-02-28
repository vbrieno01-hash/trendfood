

## Plano: Atualização da identidade visual TrendFood

### Resumo
Atualizar cores, logos, favicon e header da landing page para refletir a identidade visual oficial da marca.

### 1. Atualizar favicon para o ícone do chapéu de chef
- Copiar `user-uploads://Black_Chef_and_restaurant_simple_retro_logo_design_with_a_cap_chef_hat.png` para `public/favicon.png`
- Atualizar `index.html`: trocar `<link rel="icon" href="/favicon.ico">` por `<link rel="icon" href="/favicon.png" type="image/png">`

### 2. Copiar logos para o projeto
- Copiar `user-uploads://trend_1.png` para `src/assets/logo-dashboard.png` (substituir a logo atual usada no header do dashboard e landing page)
- Copiar `user-uploads://WhatsApp_Image_2026-02-24_at_20.43.38-2.png` para `src/assets/logo-icon.png` (substituir o ícone usado em Admin, Auth, Pricing, etc.)

### 3. Trocar cor primária de vermelho para laranja
**`src/index.css`** — Alterar as variáveis CSS do tema light:
- `--primary`: de `0 84% 52%` (vermelho) para `24 95% 53%` (laranja `#f97316`)
- `--accent`: de `0 84% 52%` para `24 95% 53%`
- `--destructive`: manter vermelho (é para ações destrutivas)

### 4. Atualizar header da Landing Page
**`src/pages/Index.tsx`** — Reformular o header:
- Logo à esquerda com a imagem `logoDashboard` + texto "TrendFood"
- Botões à direita: "Login" (ghost) e "Criar Loja Grátis" (primary, link para `/auth`)
- Remover "Ver planos" do header

### 5. Atualizar Hero da Landing Page
**`src/pages/Index.tsx`** — Trocar texto do hero:
- H1: "Transforme seu Delivery com a TrendFood"
- Subtítulo destacado: "Sem Taxas, Com Gestão Real"
- Trocar gradiente do span de `from-red-500 via-red-400 to-orange-400` para `from-orange-400 via-orange-500 to-amber-500`

### Detalhes técnicos
- As logos enviadas (trend_1.png e chapéu) substituem os arquivos existentes em `src/assets/` e `public/`, então todas as importações existentes continuam funcionando sem alteração
- A mudança de `--primary` em CSS afeta globalmente todos os botões, badges e elementos que usam a cor primária
- O Admin já importa `logo-icon.png`, o Dashboard já importa `logo-dashboard.png` — basta substituir os arquivos

