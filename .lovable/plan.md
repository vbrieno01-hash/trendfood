

# Completar Splash Screen e Push Notifications

## O que ja foi feito
- Plugins `@capacitor/splash-screen` e `@capacitor/push-notifications` instalados
- `capacitor.config.ts` configurado com SplashScreen e PushNotifications

## O que falta

### 1. Criar tabela `device_tokens` no banco de dados
Tabela para armazenar os tokens FCM de cada dispositivo:
- `id` (uuid, PK)
- `org_id` (uuid, referencia organizations)
- `user_id` (uuid)
- `token` (text, unique)
- `platform` (text: 'android' | 'ios' | 'web')
- `created_at` (timestamptz)

RLS: usuario so insere/ve/deleta seus proprios tokens.

### 2. Criar hook `usePushNotifications.ts`
- Pede permissao ao usuario
- Registra o dispositivo no FCM
- Salva o token na tabela `device_tokens` vinculado ao `org_id` e `user_id`
- Escuta notificacoes recebidas (foreground) e clicadas (background)
- So executa em plataforma nativa (Capacitor)

### 3. Adicionar SplashScreen.hide() no App.tsx
- Importar `SplashScreen` do `@capacitor/splash-screen`
- Chamar `SplashScreen.hide()` no useEffect inicial, apos o app carregar
- Usar try/catch para nao quebrar no navegador web

### 4. Integrar push no DashboardPage
- Chamar o hook `usePushNotifications` no Dashboard
- O registro acontece automaticamente quando o usuario abre o dashboard no APK

## Secao Tecnica

### Tabela device_tokens (SQL)
```text
CREATE TABLE device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'android',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Usuario insere seus proprios tokens
CREATE POLICY "device_tokens_insert_own" ON device_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usuario ve seus proprios tokens
CREATE POLICY "device_tokens_select_own" ON device_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Usuario deleta seus proprios tokens
CREATE POLICY "device_tokens_delete_own" ON device_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Dono da org pode ver tokens da org (para enviar pushes)
CREATE POLICY "device_tokens_select_org_owner" ON device_tokens
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM organizations WHERE id = device_tokens.org_id)
  );
```

### Hook usePushNotifications.ts
```text
- Importa PushNotifications do @capacitor/push-notifications
- Importa Capacitor.isNativePlatform()
- requestPermissions() -> register()
- Listener 'registration' -> upsert token no banco
- Listener 'pushNotificationReceived' -> toast com titulo
- Listener 'pushNotificationActionPerformed' -> navegar para /dashboard
```

### App.tsx (adicao)
```text
import { SplashScreen } from '@capacitor/splash-screen';

useEffect(() => {
  try { SplashScreen.hide(); } catch {}
}, []);
```

## Passos manuais apos implementacao
- Colocar imagem splash em `android/app/src/main/res/drawable/splash.png`
- Configurar Firebase e adicionar `google-services.json` no projeto Android
- Rebuild: `npx cap sync && npx cap build android`

