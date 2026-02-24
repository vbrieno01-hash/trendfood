

# Passo a Passo: Clone Limpo e Build do APK

## Importante
**NAO rode `npx cap add android`** — a pasta `android/` ja existe no repositorio com os arquivos nativos customizados (impressora). Rodar `cap add` apaga tudo e substitui por um template vazio.

## Comandos (PowerShell)

### 1. Apagar a pasta antiga (se ainda existir)
```text
Remove-Item -Recurse -Force .\trendfood-delivery-hub -ErrorAction SilentlyContinue
```

### 2. Clonar o repositorio
```text
git clone https://github.com/SEU-USUARIO/trendfood-delivery-hub.git
cd trendfood-delivery-hub
```

### 3. Instalar dependencias
```text
npm install
```

### 4. Verificar que push-notifications NAO esta instalado
```text
npm ls @capacitor/push-notifications
```
O resultado deve ser **(empty)** ou mostrar erro "not found". Se aparecer o pacote, rode `npm uninstall @capacitor/push-notifications` e repita.

### 5. Verificar que os arquivos Java customizados existem
```text
Get-ChildItem -Recurse android\app\src\main\java -Filter "*.java"
```
Deve listar:
- `BackgroundPrinterPlugin.java`
- `PrinterForegroundService.java`
- `MainActivity.java`

Se **NAO** listar esses arquivos, algo esta errado no repositorio. Nesse caso, me avise antes de continuar.

### 6. Sincronizar o Capacitor (SEM cap add)
```text
npx cap sync android
```

### 7. Build do APK
```text
cd android
.\gradlew assembleDebug
```

O APK vai estar em:
```text
android\app\build\outputs\apk\debug\app-debug.apk
```

### 8. Instalar no celular (cabo USB)
```text
adb install app\build\outputs\apk\debug\app-debug.apk
```

## Resumo visual

| Passo | Comando | Objetivo |
|-------|---------|----------|
| 1 | `Remove-Item` | Limpar pasta antiga |
| 2 | `git clone` + `cd` | Clonar repositorio limpo |
| 3 | `npm install` | Instalar dependencias JS |
| 4 | `npm ls @capacitor/push-notifications` | Confirmar que push nao existe |
| 5 | `Get-ChildItem` | Confirmar arquivos Java nativos |
| 6 | `npx cap sync android` | Sincronizar web com nativo |
| 7 | `gradlew assembleDebug` | Gerar o APK |
| 8 | `adb install` | Instalar no celular |

## O que NAO fazer
- **NAO** rode `npx cap add android` (apaga os arquivos Java customizados)
- **NAO** rode `npx cap init` (ja esta configurado)
- **NAO** edite nenhum arquivo antes de testar

