

# Corrigir Crash: Limpar usePushNotifications.ts

## O Problema Real

O arquivo `src/hooks/usePushNotifications.ts` ainda contem TODO o codigo antigo, incluindo:
- `import("@capacitor/push-notifications")` na linha 26
- `import("@capacitor/push-notifications")` na linha 85
- Imports de `@capacitor/core`, `supabase`, `sonner`, `react-router-dom`

Mesmo com o pacote removido do `package.json`, essas referencias podem causar problemas durante o build ou sync nativo.

## Solucao

Substituir **todo o conteudo** de `usePushNotifications.ts` por um no-op puro:

```typescript
// Push notifications desabilitadas - Firebase nao configurado.
// Para reativar: configure Firebase, instale @capacitor/push-notifications,
// e restaure a implementacao original.
export function usePushNotifications(_orgId?: string, _userId?: string) {
  // No-op
}
```

Zero imports. Zero referencias. O hook continua existindo para nao quebrar quem o chama.

## Arquivo Modificado

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/usePushNotifications.ts` | Substituir todo o conteudo por no-op sem nenhum import |

## Apos aprovar

Na sua maquina, rode:

```
git pull
rm -rf node_modules
npm install
rm -rf android
npx cap add android
npx cap sync android
```

Depois rebuilde o APK. Dessa vez o plugin push-notifications nao vai existir em lugar nenhum.

