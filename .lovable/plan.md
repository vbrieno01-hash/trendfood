

## Plano: Corrigir Tema Dark Mode — Cores Mais Limpas e Consistentes

### Problema
O dark mode atual usa tons acastanhados/marrons (`hsl(20 14% 8%)`) que ficam estranhos e sujos. A sidebar do dashboard tem `background: #111111` hardcoded que conflita com o tema. O resultado é um visual escuro e feio, sem a sofisticação esperada.

### Correções

**1. Variáveis CSS do Dark Mode (`src/index.css`)**
- Trocar os tons marrons por cinzas neutros mais limpos e modernos:
  - `--background`: cinza escuro neutro (`220 15% 6%` → quase preto azulado)
  - `--card`: cinza um pouco mais claro (`220 15% 9%`)
  - `--foreground`: branco suave (`220 10% 95%`)
  - `--muted`: cinza médio escuro neutro
  - `--border`: cinza escuro sutil com leve tom azulado
  - `--secondary`: cinza intermediário
- Manter o laranja primário (`24 95% 53%`) intacto

**2. Sidebar do Dashboard (`src/pages/DashboardPage.tsx`)**
- Remover `style={{ background: "#111111" }}` hardcoded
- Usar classes Tailwind que respeitem o tema: `bg-card` ou uma classe com variável CSS para que funcione em ambos os modos (light = escuro, dark = mais escuro)
- Alternativa: usar `bg-[hsl(220,15%,7%)]` no dark mode e manter o preto no light (sidebar sempre escura)

**3. Mobile Header do Dashboard**
- Garantir que `bg-card` e `border-border` fiquem bonitos com as novas variáveis

### Arquivos alterados
- `src/index.css` — variáveis `.dark`
- `src/pages/DashboardPage.tsx` — sidebar background

### O que NÃO muda
- Variáveis do light mode
- Toda a lógica de negócio
- Componentes do admin (já estilizados)

