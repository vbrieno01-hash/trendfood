

## Plano: Dark Mode Global com Toggle

### Contexto
O projeto já tem `next-themes` instalado, `darkMode: ["class"]` no Tailwind, e variáveis CSS dark definidas no `index.css`. Falta apenas o `ThemeProvider` envolvendo a app e um toggle acessível.

### Alterações

**1. Envolver App com ThemeProvider (`src/App.tsx`)**
- Importar `ThemeProvider` de `next-themes`
- Envolver `<AppInner />` com `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>`

**2. Criar componente `ThemeToggle` (`src/components/ThemeToggle.tsx`)**
- Componente simples com ícone Sun/Moon que alterna entre light/dark usando `useTheme()` de `next-themes`
- Botão compacto, estilizado como ícone discreto

**3. Adicionar toggle no Admin (`src/pages/AdminPage.tsx`)**
- No header/sidebar do admin, adicionar o `<ThemeToggle />` próximo ao botão de logout

**4. Adicionar toggle no Dashboard (`src/pages/DashboardPage.tsx`)**
- No header/sidebar do dashboard do lojista, adicionar o `<ThemeToggle />`

### Resultado
- Todos os usuários (admin e clientes novos/antigos) terão o toggle
- A preferência persiste automaticamente via `localStorage` (comportamento padrão do `next-themes`)
- Todas as cores já definidas em `:root` e `.dark` no CSS serão aplicadas automaticamente

