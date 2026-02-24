

## AndroidManifest.xml Completo

Vou montar o `AndroidManifest.xml` combinando o que o Gemini fez (login funcionando) com todas as permissoes de Bluetooth e o servico de impressao em segundo plano que nos configuramos antes.

### O que sera incluido

**Da versao do Gemini (que fez o login funcionar):**
- Permissoes de internet (`INTERNET`, `ACCESS_NETWORK_STATE`)
- Activity principal com `singleTask` e `configChanges`
- FileProvider
- `usesCleartextTraffic`

**Das configuracoes de Bluetooth que funcionaram:**
- `BLUETOOTH` e `BLUETOOTH_ADMIN` (Android 11 e anterior)
- `BLUETOOTH_SCAN` e `BLUETOOTH_CONNECT` com `usesPermissionFlags` (Android 12+)
- `ACCESS_FINE_LOCATION` e `ACCESS_COARSE_LOCATION` (necessario para BLE scanner)
- `FOREGROUND_SERVICE` e `FOREGROUND_SERVICE_CONNECTED_DEVICE`
- `WAKE_LOCK` (manter tela ativa durante impressao)
- Declaracao do `PrinterForegroundService` com `foregroundServiceType="connectedDevice"`

### Arquivo completo para colar

Substituir o conteudo de `android/app/src/main/AndroidManifest.xml` por:

```text
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Internet -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <!-- Bluetooth (Android 11 e anterior) -->
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />

    <!-- Bluetooth (Android 12+) -->
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

    <!-- Localizacao (necessario para BLE scanner) -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

    <!-- Servico em segundo plano -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation|density"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Servico de impressao Bluetooth em segundo plano -->
        <service
            android:name=".PrinterForegroundService"
            android:foregroundServiceType="connectedDevice"
            android:exported="false" />

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>
</manifest>
```

### O que mudou em relacao ao manifest do Gemini

| Item | Manifest do Gemini | Manifest completo |
|------|-------------------|-------------------|
| Internet | Sim | Sim |
| Bluetooth | Nao | Sim (todas as permissoes) |
| Localizacao | Nao | Sim (necessario para BLE) |
| Foreground Service | Nao | Sim |
| Wake Lock | Nao | Sim |
| PrinterForegroundService | Nao | Sim (declarado) |

### Como aplicar

1. Abra o arquivo `android/app/src/main/AndroidManifest.xml`
2. Apague todo o conteudo
3. Cole o XML acima
4. Rode `.\gradlew.bat assembleDebug` na pasta `android/`

O login vai continuar funcionando E o Bluetooth vai estar configurado.

