

## Plano: PWA Completo — Página de Instalação + Proteção no Preview

### O que já existe
- `vite-plugin-pwa` configurado com manifest, ícones (192/512), service worker com autoUpdate
- Ícones `pwa-192.png` e `pwa-512.png` no `/public`
- Manifest do motoboy separado (`manifest-courier.json`)

### O que falta

| # | Arquivo | Mudança |
|---|---------|---------|
| 1 | `vite.config.ts` | Adicionar `devOptions: { enabled: false }` para não registrar SW no preview do Lovable |
| 2 | `src/main.tsx` | Adicionar guard para desregistrar SW em iframes e hosts de preview |
| 3 | `src/pages/InstallPage.tsx` | **Nova página** `/instalar` com instruções visuais e botão de instalação |
| 4 | `src/App.tsx` | Adicionar rota `/instalar` |
| 5 | `index.html` | Adicionar `<link rel="manifest">` explícito e meta tags PWA que faltam |

### Detalhes

**Página `/instalar`:**
- Detecta se já está instalado (`display-mode: standalone`)
- Botão "Instalar TrendFood" que usa o evento `beforeinstallprompt` (Android/Chrome)
- Instruções visuais para iPhone: "Toque em Compartilhar → Adicionar à Tela de Início"
- Design limpo com ícone do app e benefícios (acesso rápido, sem navegador, notificações)

**Guard no main.tsx:**
- Detecta se está em iframe ou em host de preview do Lovable
- Se sim, desregistra qualquer SW existente para evitar cache problemático

**vite.config.ts:**
- `devOptions: { enabled: false }` — SW só ativa em produção

### Resultado
- App totalmente instalável como app nativo no celular
- Página dedicada para guiar o cliente na instalação
- Zero interferência no preview do Lovable
- 3 arquivos editados, 1 arquivo novo, 0 migrações

