

# Corrigir Crash do APK - Parte 3: Abordagem Definitiva

## Diagnostico

As correcoes anteriores (try/catch no useAuth, BluetoothDevice para any, guards nos useEffects) foram necessarias mas insuficientes. A analise detalhada revela que o crash ocorre no momento da **transicao de loading para dashboard renderizado**, quando dezenas de operacoes pesadas disparam simultaneamente no WebView Android:

1. **Sem delay pos-auth**: Quando `loading` vira `false`, todos os useEffects que dependem de `orgId` disparam ao mesmo tempo — realtime subscriptions, push notifications, queries, Bluetooth — sobrecarregando o WebView.

2. **`usePushNotifications` sem guard**: Na linha 73 do DashboardPage, o hook roda imediatamente. No APK, ele chama `PushNotifications.register()` que pode crashar no nivel nativo se o Firebase/FCM nao estiver 100% configurado. JavaScript try/catch nao captura crashes nativos.

3. **`supabase.functions.invoke("check-subscription")` sem catch**: Linha 511 — se a edge function nao existir, gera unhandled rejection.

4. **DashboardPage nao tem ErrorBoundary proprio**: Um erro em qualquer sub-componente (tab) derruba o app inteiro sem feedback.

5. **Imports estaticos de 15+ tabs**: Todo o codigo das tabs carrega no momento que o DashboardPage monta, mesmo que so uma seja renderizada.

## Solucao

### 1. Lazy-load do DashboardPage no App.tsx

Usar `React.lazy` + `Suspense` para que o DashboardPage carregue sob demanda em vez de no bundle principal:

```typescript
const DashboardPage = React.lazy(() => import("./pages/DashboardPage"));

// Na rota:
<Route path="/dashboard" element={
  <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
    <DashboardPage />
  </Suspense>
} />
```

### 2. Adicionar estado "ready" com delay no DashboardPage

Criar um flag `isReady` que so ativa 500ms apos `loading` virar false E `user` existir. Todos os useEffects pesados dependem deste flag:

```typescript
const [isReady, setIsReady] = useState(false);

useEffect(() => {
  if (loading || !user || !organization) return;
  const timer = setTimeout(() => setIsReady(true), 500);
  return () => clearTimeout(timer);
}, [loading, user, organization]);
```

### 3. Guardar TODOS os useEffects pesados com `isReady`

- Realtime subscription (linha 166): `if (!orgId || !isReady) return;`
- Push notifications: mover para dentro do DashboardPage com guard `isReady`
- BT auto-reconnect (linha 435): `if (!isReady) return;`
- Print queue polling (linha 287): `if (!isReady || !orgId) return;`

### 4. Proteger `usePushNotifications` contra crash nativo

Mover a chamada de `usePushNotifications` para um useEffect guardado e envolver em try/catch adicional:

```typescript
// Remover: usePushNotifications(organization?.id, user?.id);
// Adicionar:
useEffect(() => {
  if (!isReady || !organization?.id || !user?.id) return;
  try {
    // Import dinamico para nao carregar o modulo desnecessariamente
    import("@/hooks/usePushNotifications").then(m => {
      // A logica de push ja esta protegida internamente
    }).catch(() => {});
  } catch {}
}, [isReady, organization?.id, user?.id]);
```

Na verdade, como `usePushNotifications` e um hook e nao pode ser chamado condicionalmente, a solucao e adicionar o flag `isReady` como parametro:

```typescript
usePushNotifications(isReady ? organization?.id : undefined, isReady ? user?.id : undefined);
```

### 5. Adicionar catch no invoke de check-subscription

```typescript
supabase.functions.invoke("check-subscription", {
  headers: { Authorization: `Bearer ${session.access_token}` },
}).then(() => refreshOrganization()).catch((err) => {
  console.warn("[Dashboard] check-subscription failed:", err);
});
```

### 6. Adicionar ErrorBoundary especifico para o conteudo das tabs

Envolver a area de conteudo principal (linhas 888-915) em um ErrorBoundary que mostra uma mensagem amigavel em vez de derrubar todo o app.

### 7. Adicionar console.log em pontos criticos para debug via Logcat

Adicionar breadcrumbs em cada etapa critica do ciclo de vida:

```typescript
console.log("[Dashboard] Mount");
console.log("[Dashboard] Auth loaded, user:", !!user, "org:", !!organization);
console.log("[Dashboard] isReady activated");
console.log("[Dashboard] Realtime channel created");
console.log("[Dashboard] Push notifications setup started");
```

Esses logs aparecem no Android Studio Logcat e permitem identificar exatamente onde o crash ocorre caso o problema persista.

## Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/App.tsx` | Lazy-load do DashboardPage com React.lazy + Suspense |
| `src/pages/DashboardPage.tsx` | Adicionar estado isReady com delay, guardar todos useEffects, proteger push notifications, catch no check-subscription, adicionar console.logs, ErrorBoundary nas tabs |

## Resultado Esperado

O APK nao vai mais crashar porque:
- O DashboardPage carrega sob demanda (lazy), reduzindo o peso do bundle inicial
- Operacoes nativas (push, bluetooth, realtime) so iniciam 500ms apos a autenticacao estar completamente pronta
- Um ErrorBoundary especifico captura erros nas tabs sem derrubar o app
- Console.logs permitem diagnostico preciso via Logcat se algum problema persistir

## Bluetooth continua funcionando?

Sim! O delay de 500ms apenas atrasa ligeiramente o inicio do auto-reconnect. O Bluetooth funciona normalmente apos a estabilizacao.

