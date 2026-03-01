

## Plano: Redesign Completo de TODAS as Abas do Painel Admin

### Problema
A Home e a Sidebar do admin já foram modernizadas com glassmorphism, animações e visual premium. Porém, as sub-abas (Configurações, Logs, Ativações, Chat de Vendas, WhatsApp, Indicações, Guia, Funcionalidades) ainda usam o visual genérico antigo — cards simples, tabelas sem estilo, sem animações, sem identidade TrendFood.

### O que muda — Componente por Componente

**1. Aba Configurações (`AdminPage.tsx` config section + sub-componentes)**
- Envolver tudo em container com título de seção premium + ícone
- `PlansConfigSection.tsx`: Cards de plano com gradiente sutil, ícone do plano colorido, hover com elevação, badges mais vivos. Formulário de edição com glassmorphism background
- `TrialConfigSection.tsx`: Card glassmorphism com ícone de relógio estilizado, input com visual premium
- `PlatformConfigSection.tsx`: Grid de inputs com cards individuais glassmorphism, labels mais refinados
- `AdminDownloadsSection.tsx`: Cards de APK/EXE com ícones coloridos grandes, status indicators animados, visual premium

**2. Aba Logs de Erros (`ErrorLogsTab.tsx`)**
- Header com título + badge animado + botões estilizados como pills
- Filtros de source como pills premium (igual aos filtros da aba Lojas)
- Tabela com `admin-glass` background, hover com gradiente, rows alternadas
- Stack trace expandível com glassmorphism e font melhor
- Empty state com ícone maior e animação fade-in

**3. Aba Ativações (`ActivationLogsTab.tsx`)**
- Seção de Webhook Links com glassmorphism e ícone de link estilizado
- Tabs de email/org com visual premium
- URL gerada em card glassmorphism com borda lateral colorida
- Tabela de logs com `admin-glass`, hover com gradiente, badges mais vivos
- Animações de entrada (fade-in)

**4. Aba Chat de Vendas (`SalesChatTab.tsx`)**
- Container com `admin-glass` em vez de `bg-card`
- Lista de conversas com hover premium e indicador lateral quando ativo
- Header do chat com gradiente sutil
- Bolhas de mensagem mais refinadas (bot com borda e ícone colorido)
- Input area com glassmorphism
- Empty state com animação

**5. Aba WhatsApp (`WhatsAppConnectTab.tsx`)**
- Substituir Card genérico por layout glassmorphism
- QR Code area com gradiente de fundo e borda estilizada
- Status indicators com dots pulsantes (como no dashboard)
- Botões com hover scale

**6. Aba Indicações (`ReferralsTab.tsx`)**
- KPI cards com glassmorphism + gradiente (mesmo padrão da Home)
- Tabela com `admin-glass`, hover gradiente, avatares coloridos nas lojas
- Empty state premium
- Animações de entrada staggered

**7. Aba Guia (`AdminGuideTab.tsx`)**
- Section rows com glassmorphism e hover mais dramático
- Upload button com estilo premium
- Thumbnails com border mais sofisticada e shadow
- Header da seção com ícone animado

**8. Aba Funcionalidades (inline em `AdminPage.tsx`)**
- Feature cards já usam `admin-glass` — refinar com gradiente de fundo baseado no status
- Ícone com background colorido por status (verde=disponível, azul=beta, amarelo=em breve)

### Padrão visual aplicado em TODAS as abas
- `admin-glass` para containers principais
- `animate-admin-fade-in` com delays staggered
- Hover com `hover:shadow-lg hover:-translate-y-0.5`
- Headers de seção: ícone + título bold + badge de contagem
- Tabelas: header uppercase tracking-wider, hover com gradiente sutil
- Badges: rounded-full, font-bold, cores por contexto
- Empty states: ícone grande semitransparente + texto + animação

### Arquivos alterados
- `src/components/admin/PlansConfigSection.tsx`
- `src/components/admin/TrialConfigSection.tsx`
- `src/components/admin/PlatformConfigSection.tsx`
- `src/components/admin/AdminDownloadsSection.tsx`
- `src/components/admin/ErrorLogsTab.tsx`
- `src/components/admin/ActivationLogsTab.tsx`
- `src/components/admin/SalesChatTab.tsx`
- `src/components/admin/WhatsAppConnectTab.tsx`
- `src/components/admin/ReferralsTab.tsx`
- `src/components/admin/AdminGuideTab.tsx`
- `src/pages/AdminPage.tsx` (features section + config wrapper)

### O que NÃO muda
- Toda a lógica de negócio, queries, mutations
- Sidebar e Home (já premium)
- Rotas e autenticação
- GrowthCharts (já atualizado)

