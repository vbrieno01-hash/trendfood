

## Plano: Mostrar o chat de suporte também no APK

### Problema
Na linha 136 do `App.tsx`, o widget de suporte é renderizado apenas quando **não** é plataforma nativa:
```
{!Capacitor.isNativePlatform() && <ConditionalSupportChat />}
```

### Mudança
**Arquivo: `src/App.tsx` (linha 136)**

Remover a condição `!Capacitor.isNativePlatform()`, deixando apenas:
```
<ConditionalSupportChat />
```

Isso faz o balão de chat aparecer em todas as plataformas (web e APK) nas rotas internas (dashboard, cozinha, garcom, admin, motoboy).

Uma única linha alterada. Sem efeitos colaterais.

