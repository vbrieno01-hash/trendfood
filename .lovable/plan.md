
# Splash Screen e Push Notifications no Capacitor

## O que sera feito

### 1. Splash Screen
Adicionar a tela de carregamento com a logo TrendFood quando o app abre no Android.

**Dependencia:** `@capacitor/splash-screen`

**Configuracao no `capacitor.config.ts`:**
- Definir cor de fundo laranja (#FF6B00) ou branca
- Tempo de exibicao automatico (2-3 segundos)
- Fade out animado
- Configurar para usar a logo do TrendFood

**Arquivos de imagem necessarios (manual apos sync):**
- O usuario precisara colocar a imagem do splash em `android/app/src/main/res/drawable/splash.png`
- Alternativa: usar o modo "launch screen" padrao do Capacitor que exibe um background com a logo centralizada

**Codigo TypeScript:**
- Chamar `SplashScreen.hide()` no `App.tsx` apos o app carregar, para controlar quando a splash desaparece

### 2. Push Notifications
Substituir o `@capacitor/local-notifications` atual por `@capacitor/push-notifications` para notificacoes remotas (enviadas pelo servidor).

**Dependencia:** `@capacitor/push-notifications`

**O que sera implementado:**
- Registro do dispositivo para receber push notifications
- Salvar o token FCM (Firebase Cloud Messaging) no banco de dados, vinculado a organizacao
- Listener para receber notificacoes em foreground e background
- Hook `usePushNotifications.ts` para gerenciar tudo

**Tabela no banco de dados:**
- `device_tokens` com colunas: `id`, `org_id`, `user_id`, `token`, `platform`, `created_at`
- Isso permite enviar pushes para dispositivos especificos de cada organizacao

**Integracao:**
- No `DashboardPage.tsx`, registrar o dispositivo automaticamente ao abrir
- Quando um novo pedido chegar, uma edge function podera enviar push para todos os dispositivos da org

## Etapas de implementacao

1. Instalar `@capacitor/splash-screen` e `@capacitor/push-notifications`
2. Atualizar `capacitor.config.ts` com configuracoes de Splash Screen e Push
3. Criar hook `usePushNotifications.ts` para registro e escuta de notificacoes
4. Criar tabela `device_tokens` no banco de dados
5. Adicionar `SplashScreen.hide()` no `App.tsx`
6. Integrar push notifications no Dashboard

## Secao Tecnica

### capacitor.config.ts (adicoes)
```text
plugins: {
  SplashScreen: {
    launchShowDuration: 2500,
    launchAutoHide: false,       // controlamos via codigo
    backgroundColor: "#FFFFFF",
    showSpinner: false,
    launchFadeOutDuration: 500,
    splashFullScreen: true,
    splashImmersiveHidden: true,
  },
  PushNotifications: {
    presentationOptions: ["badge", "sound", "alert"],
  },
  // ... plugins existentes mantidos
}
```

### Hook usePushNotifications.ts
```text
- requestPermissions(): pede permissao ao usuario
- register(): registra no FCM e salva token no banco
- addListeners(): escuta notificacoes recebidas/clicadas
- Salva token na tabela device_tokens vinculado ao org_id e user_id
```

### Tabela device_tokens
```text
- id (uuid, PK)
- org_id (uuid, FK -> organizations)
- user_id (uuid)
- token (text, unique)
- platform (text: 'android' | 'ios' | 'web')
- created_at (timestamptz)
- RLS: usuario so ve/insere seus proprios tokens
```

### App.tsx (mudanca)
```text
import { SplashScreen } from '@capacitor/splash-screen';
// No useEffect inicial:
SplashScreen.hide();
```

## Limitacoes
- Push Notifications requer configuracao do Firebase (google-services.json) no projeto Android -- o usuario precisara criar um projeto Firebase e baixar o arquivo
- Splash Screen requer imagem em `android/app/src/main/res/drawable/` -- apos `npx cap sync`
- Ambos requerem rebuild do APK
