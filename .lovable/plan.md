

# Corrigir Crash do APK - Causa Raiz Encontrada

## O Problema Real

O screenshot mostra o erro exato:

```
java.lang.IllegalStateException: Default FirebaseApp is not initialized
in this process app.trendfood.delivery.
Make sure to call FirebaseApp.initializeApp(Context) first.
```

A cadeia de chamadas e:

```text
usePushNotifications() 
  -> PushNotifications.register() [JavaScript]
    -> PushNotificationsPlugin.register() [Java nativo]
      -> FirebaseMessaging.getInstance() [Java nativo]
        -> CRASH: FirebaseApp nao inicializado
```

Este crash acontece na camada **nativa Java** do Android, nao em JavaScript. O `try/catch` no codigo JS nao consegue captura-lo. O app fecha instantaneamente.

A causa raiz e simples: o arquivo `google-services.json` do Firebase nao existe no projeto Android, entao o Firebase nunca e inicializado.

## Solucao

Existem duas acoes necessarias:

### 1. Proteger o codigo contra a ausencia do Firebase (imediato)

Modificar o `usePushNotifications.ts` para verificar se o plugin PushNotifications esta realmente disponivel antes de chamar `register()`. Usar o metodo `Capacitor.isPluginAvailable()` que retorna `false` se o plugin nativo nao consegue funcionar:

```typescript
// src/hooks/usePushNotifications.ts
const setup = async () => {
  try {
    // Verificar se o plugin nativo esta funcional
    // (retorna false se Firebase nao esta configurado)
    if (!Capacitor.isPluginAvailable('PushNotifications')) {
      console.warn("[Push] Plugin PushNotifications nao disponivel (Firebase nao configurado?)");
      return;
    }

    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== "granted") {
      console.warn("[Push] Permissao negada");
      return;
    }

    await PushNotifications.register();
    // ... resto do codigo
  } catch (err) {
    console.error("[Push] Erro geral:", err);
  }
};
```

**Importante**: O `Capacitor.isPluginAvailable()` pode nao detectar a ausencia do `google-services.json` em todos os casos. Entao, como protecao adicional, vamos tambem mover os listeners para **antes** do `register()` para capturar o `registrationError`:

```typescript
const setup = async () => {
  try {
    // Registrar listener de erro ANTES de chamar register()
    await PushNotifications.addListener("registrationError", (err) => {
      console.error("[Push] Erro no registro:", err.error);
    });

    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== "granted") return;

    // Chamar register() dentro de setTimeout para dar tempo
    // ao bridge nativo de processar sem bloquear a thread principal
    setTimeout(async () => {
      try {
        await PushNotifications.register();
      } catch (err) {
        console.warn("[Push] register() falhou:", err);
      }
    }, 100);

    // ... outros listeners
  } catch (err) {
    console.error("[Push] Erro geral:", err);
  }
};
```

**Porem**, como o crash e nativo (Java), nenhum try/catch em JS vai resolver. A unica solucao 100% segura e **desabilitar completamente** o push notifications ate o Firebase estar configurado.

A solucao definitiva sera: **remover o import e a chamada do plugin PushNotifications** do codigo e substituir por um wrapper seguro que verifica a disponibilidade do Firebase antes de qualquer chamada nativa.

### 2. Configurar o Firebase no projeto Android (necessario para push funcionar)

Para que as push notifications funcionem no futuro, voce precisara:

1. Criar um projeto no Firebase Console (console.firebase.google.com)
2. Registrar o app com o package `app.trendfood.delivery`
3. Baixar o arquivo `google-services.json`
4. Colocar o arquivo em `android/app/google-services.json`
5. Rebuildar o APK

**Ate la, o push deve ser desativado para nao crashar o app.**

## Arquivo Modificado

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/usePushNotifications.ts` | Desabilitar completamente a chamada a `PushNotifications.register()` quando Firebase nao esta configurado. Usar flag de controle e verificacao de disponibilidade do plugin. |

## O que muda na pratica

- O APK para de crashar imediatamente ao fazer login
- Push notifications ficam desabilitadas ate o Firebase ser configurado
- Todo o resto (Bluetooth, realtime, pedidos) continua funcionando normalmente
- Quando voce configurar o Firebase futuramente, basta rebuildar o APK e tudo funcionara

