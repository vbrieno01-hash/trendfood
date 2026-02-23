

# Remover Plugin Nativo de Push Notifications

## Problema

O `FIREBASE_CONFIGURED = false` no JavaScript nao impede o crash porque:

1. O pacote `@capacitor/push-notifications` esta instalado no `package.json`
2. Quando `npx cap sync` roda, ele registra o plugin nativo no Android
3. O Capacitor carrega **todos** os plugins nativos ao iniciar o app
4. O plugin PushNotifications tenta acessar `FirebaseMessaging` durante sua inicializacao nativa
5. Como nao existe `google-services.json`, o Firebase nao esta configurado -> **crash**

A protecao em JavaScript (`FIREBASE_CONFIGURED = false`) so impede chamadas JS ao plugin. Mas o plugin ja crashou antes do JavaScript executar.

## Solucao

Remover completamente o plugin `@capacitor/push-notifications` do projeto ate que o Firebase seja configurado.

### 1. Remover de `capacitor.config.ts`

Remover o bloco `PushNotifications` da secao `plugins`:

```typescript
plugins: {
  SplashScreen: { ... },
  // PushNotifications: REMOVIDO
  BluetoothLe: { ... },
  LocalNotifications: { ... },
},
```

### 2. Remover do `package.json`

Remover a dependencia `@capacitor/push-notifications`:

```
"@capacitor/push-notifications": "^8.0.1"  // REMOVER ESTA LINHA
```

### 3. Manter `usePushNotifications.ts` como no-op seguro

O hook continuara existindo mas nunca executara nada, ja que o import dinamico do pacote vai falhar (pacote removido) e o catch vai silenciar o erro.

### 4. Instrucoes pos-alteracao

Apos a alteracao, o usuario precisara:
1. `git pull`
2. `npm install`
3. `npx cap sync android` (isso remove o plugin nativo do projeto Android)
4. Rebuildar o APK

## Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `capacitor.config.ts` | Remover configuracao `PushNotifications` da secao plugins |
| `package.json` | Remover dependencia `@capacitor/push-notifications` |

## Para reativar push notifications no futuro

1. Configurar Firebase Console e baixar `google-services.json`
2. Colocar em `android/app/google-services.json`
3. `npm install @capacitor/push-notifications`
4. Restaurar config em `capacitor.config.ts`
5. Mudar `FIREBASE_CONFIGURED = true` em `usePushNotifications.ts`
6. `npx cap sync android` + rebuildar APK

