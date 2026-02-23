

# Completar Splash Screen e Push Notifications (tentativa final)

## Importante para o usuario
Ao aprovar este plano, vai aparecer uma segunda confirmacao para criar a tabela no banco de dados. **Clique nessa segunda confirmacao tambem, sem enviar mensagem no chat.** Isso vai permitir que o processo complete sem interrupcao.

## O que sera feito (tudo de uma vez)

### 1. Criar tabela `device_tokens` no banco de dados
Tabela para armazenar tokens FCM dos dispositivos.

Colunas:
- `id` (uuid, PK)
- `org_id` (uuid, referencia organizations, ON DELETE CASCADE)
- `user_id` (uuid)
- `token` (text, UNIQUE)
- `platform` (text, default 'android')
- `created_at` (timestamptz)

Politicas RLS:
- INSERT: usuario insere seus proprios tokens
- SELECT: usuario ve seus proprios tokens
- DELETE: usuario deleta seus proprios tokens
- SELECT extra: dono da organizacao ve tokens da org

### 2. Criar hook `usePushNotifications.ts`
- Verifica se esta em plataforma nativa (Capacitor)
- Pede permissao ao usuario
- Registra no FCM
- Salva/atualiza token na tabela `device_tokens`
- Escuta notificacoes em foreground (exibe toast)
- Escuta clique em notificacao background (navega para /dashboard)

### 3. Adicionar SplashScreen.hide() no App.tsx
- Importar SplashScreen do @capacitor/splash-screen
- Chamar hide() no useEffect com try/catch (nao quebra no browser)

### 4. Integrar no DashboardPage.tsx
- Chamar o hook usePushNotifications passando orgId e userId

## Secao Tecnica

### SQL da tabela
```text
CREATE TABLE public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'android',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "device_tokens_insert_own" ON public.device_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "device_tokens_select_own" ON public.device_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "device_tokens_delete_own" ON public.device_tokens
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "device_tokens_select_org_owner" ON public.device_tokens
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM public.organizations WHERE id = device_tokens.org_id)
  );
```

### Hook usePushNotifications.ts
```text
- Importa PushNotifications do @capacitor/push-notifications
- Importa Capacitor.isNativePlatform()
- useEffect que executa apenas em plataforma nativa:
  1. requestPermissions()
  2. register()
  3. Listener 'registration' -> upsert token no banco via supabase
  4. Listener 'pushNotificationReceived' -> toast
  5. Listener 'pushNotificationActionPerformed' -> navigate('/dashboard')
```

### App.tsx
```text
import { SplashScreen } from '@capacitor/splash-screen';

useEffect(() => {
  try { SplashScreen.hide(); } catch {}
}, []);
```

## Passos manuais apos implementacao
- Configurar Firebase e adicionar `google-services.json` no projeto Android
- Colocar imagem splash em `android/app/src/main/res/drawable/splash.png`
- Rebuild: `npx cap sync && npx cap build android`

