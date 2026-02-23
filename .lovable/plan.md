

# App nativo Android via Capacitor para impressao Bluetooth confiavel

## Problema

O Web Bluetooth no Chrome Android tem restricoes severas: reconexao automatica falha frequentemente porque o navegador exige gesto do usuario para conexoes GATT. O desktop resolve isso com o `trendfood.exe` que roda fora do navegador. Precisamos do equivalente mobile.

## Solucao: Capacitor + Bluetooth nativo

Empacotar o app web existente como um APK Android usando Capacitor. Isso permite usar plugins de Bluetooth nativos que nao tem as restricoes do Web Bluetooth.

### O que muda

1. **Instalar Capacitor** no projeto (dependencias npm + configuracao)
2. **Adicionar plugin de Bluetooth nativo** (`@capacitor-community/bluetooth-le`) que permite:
   - Reconexao automatica confiavel (sem precisar de gesto)
   - Rodar em background
   - Conexao persistente mesmo com tela desligada
3. **Criar camada de abstração** em `src/lib/bluetoothPrinter.ts` que detecta se esta rodando como app nativo (Capacitor) ou no navegador:
   - Se nativo: usa o plugin Bluetooth nativo
   - Se navegador: continua usando Web Bluetooth como hoje
4. **Gerar o APK** que o lojista instala no celular

### Fluxo para o lojista

```text
Hoje (navegador):
  Chrome -> Web Bluetooth -> falha reconexao -> frustração

Novo (app nativo):
  App TrendFood (APK) -> Bluetooth nativo -> reconexao confiavel
  (funciona igual o .exe mas no celular)
```

### Passos tecnicos

#### 1. Dependencias novas
- `@capacitor/core`
- `@capacitor/cli` (dev)
- `@capacitor/android`
- `@capacitor-community/bluetooth-le`

#### 2. Configuracao Capacitor (`capacitor.config.ts`)
- appId: `app.lovable.4930409c277c4049bcfee466bb996cff`
- appName: `TrendFood`
- server.url apontando para o preview (hot-reload em dev)

#### 3. Abstração Bluetooth (`src/lib/bluetoothPrinter.ts`)
- Detectar ambiente: `Capacitor.isNativePlatform()`
- Se nativo: usar `BleClient` do `@capacitor-community/bluetooth-le`
  - `BleClient.initialize()`
  - `BleClient.connect(deviceId)` (reconecta sem gesto)
  - `BleClient.write(deviceId, serviceUUID, charUUID, data)`
- Se web: manter codigo atual (Web Bluetooth)
- Mesma interface publica para o resto do app

#### 4. Build e distribuicao
- Exportar projeto para GitHub
- `npm install` + `npx cap add android` + `npx cap sync`
- Gerar APK via Android Studio
- Distribuir o APK da mesma forma que o `.exe` (GitHub Releases)

### Vantagens vs Web Bluetooth
- Reconexao automatica funciona 100%
- Roda em background (nao precisa manter o Chrome aberto)
- Sem restricoes de gesto do usuario
- Conexao mais estavel e rapida
- Push notifications nativas (futuro)

### Limitacoes
- Precisa de Android Studio para gerar o APK
- APK precisa ser instalado manualmente (fora da Play Store, ou publicar na Play Store depois)
- Desenvolvimento inicial requer setup local (git pull, npm install, etc)

## Arquivos alterados/criados

- `capacitor.config.ts` -- configuracao do Capacitor (novo)
- `src/lib/bluetoothPrinter.ts` -- adicionar camada nativa com fallback web
- `src/lib/nativeBluetooth.ts` -- implementacao do plugin BLE nativo (novo)
- `package.json` -- dependencias Capacitor + plugin BLE

## Alternativa mais simples

Se nao quiser o setup do Capacitor agora, uma alternativa intermediaria e criar um **APK Android standalone simples** (fora do Lovable) que faz exatamente o que o `.exe` faz:
- Poll na `fila_impressao` via API
- Envia para impressora Bluetooth via API nativa do Android
- Roda como servico em background

Isso seria um projeto separado, similar ao `trendfood.exe` mas para Android.

