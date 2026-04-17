

## Diagnóstico

Hoje o `vite.config.ts` já tem:
- `registerType: "autoUpdate"`
- `skipWaiting: true` + `clientsClaim: true`
- `cleanupOutdatedCaches: true`

Isso faz o SW novo **assumir sozinho no próximo refresh**. Problema: o lojista precisa fechar e abrir o app pra rodar — e como você disse, *nem todos sabem disso*. Resultado: ficam em versão antiga por dias.

## As 2 opções (e qual eu recomendo)

### Opção A — Auto-reload silencioso
SW novo detectado → `window.location.reload()` automático em 2-3 segundos.
- ✅ Zero ação do lojista
- ❌ **Risco**: se ele tá no meio de um pedido no Balcão, digitando, o reload pode fazer perder o que tá fazendo. Ruim em horário de rush.

### Opção B — Balão interativo (RECOMENDADA) ⭐
Card flutuante no canto inferior direito: *"🎉 Nova versão disponível! [Atualizar agora]"*
- ✅ Lojista decide *quando* atualizar (espera o rush passar)
- ✅ Não perde nada que tá digitando
- ✅ Card só some quando ele clica → garante que vai atualizar
- ✅ Visual condiz com o tema Premium Live (glassmorphism)

### Opção C (híbrida, ainda melhor) — *minha sugestão real*
Balão interativo **+ auto-reload forçado se ficar 24h ignorando**. Assim:
- Lojista vê o card e atualiza quando puder
- Se esquecer / ignorar por 1 dia, força refresh em momento ocioso (sem digitação detectada nos últimos 30s)

## Plano de implementação

### 1. Novo componente `src/components/PWAUpdatePrompt.tsx`
Card flutuante (bottom-right, `fixed`, z-50) com:
- Ícone de sparkle/download
- Título: *"Nova versão disponível!"*
- Subtítulo: *"Clique para atualizar e ver as novidades"*
- Botão: **"Atualizar agora"** (chama `updateSW(true)` → recarrega com SW novo)
- Botão fantasma: **"Mais tarde"** (esconde por 1h via localStorage)
- Estilo glassmorphism (`dashboard-glass`), animação slide-up
- Mobile: full-width no bottom

### 2. Hook `src/hooks/usePWAUpdate.ts`
- Usa `useRegisterSW` do `virtual:pwa-register/react` (já vem com `vite-plugin-pwa`)
- Expõe: `needRefresh`, `updateServiceWorker`
- Lógica de "snooze" 1h via localStorage (`pwa_snooze_until`)
- Lógica de auto-force após 24h ignorando (timestamp `pwa_first_seen`)

### 3. `vite.config.ts` — trocar `registerType`
- Mudar de `"autoUpdate"` → `"prompt"` (deixa a gente controlar o momento via UI em vez do SW assumir sozinho)
- Manter `skipWaiting`/`clientsClaim` removidos (pra prompt funcionar) — quem assume controle agora é o `updateSW(true)`

### 4. `src/App.tsx`
- Renderizar `<PWAUpdatePrompt />` dentro do `BrowserRouter`, junto do `<Sonner />`
- Aparece em **todas as rotas internas** (Dashboard, Cozinha, Balcão, Admin)
- **Não aparece** em iframes/preview (já temos guard em `main.tsx`)

### 5. Sobre "não perder dados"
Como o usuário escolhe quando clicar, ele só atualiza quando não tá no meio de algo. Pra reforçar:
- Detectar se tem `<input>`/`<textarea>` em foco → adiar 5s e mostrar tooltip *"Termine de digitar e atualize quando puder"*
- Pedidos do Balcão/Cozinha já são salvos no banco em tempo real, então refresh não perde nada que já foi confirmado

### 6. `src/vite-env.d.ts`
- Adicionar reference type `/// <reference types="vite-plugin-pwa/react" />` pro TypeScript reconhecer o virtual module

## Risco
Baixo. Mexe em 4 arquivos, 1 novo. Não toca em banco, RLS, fluxo de pedido, pagamento. Pior caso: prompt não aparece → cai no comportamento atual (refresh manual ainda funciona).

## Resumo visual

```text
┌─────────────────────────────────────┐
│  Tela do lojista (qualquer aba)     │
│                                     │
│                                     │
│                                     │
│                  ┌────────────────┐ │
│                  │ ✨ Nova versão │ │
│                  │   disponível!  │ │
│                  │                │ │
│                  │ [Atualizar]    │ │
│                  │  Mais tarde    │ │
│                  └────────────────┘ │
└─────────────────────────────────────┘
```

