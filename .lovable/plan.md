
# Impressao em Segundo Plano no APK Android

## Problema
Atualmente o polling da fila de impressao (`setInterval` a cada 10s no `DashboardPage.tsx`) so funciona quando o app esta em primeiro plano. Quando o usuario minimiza o APK, o Android suspende a WebView e o polling para.

## Solucao
Criar um **Capacitor Plugin customizado** com um Android Foreground Service que:
1. Roda em segundo plano com uma notificacao persistente ("TrendFood - Impressao ativa")
2. Faz polling na tabela `fila_impressao` a cada 10-15 segundos
3. Envia os dados via Bluetooth BLE para a impressora mesmo com o app minimizado

## Etapas

### 1. Criar o plugin Capacitor nativo (Android/Java)
- Criar um `ForegroundService` Android que exibe uma notificacao persistente
- Dentro do servico, rodar um loop de polling que consulta a API do backend (endpoint REST) buscando jobs pendentes na `fila_impressao`
- Ao encontrar jobs, enviar via BLE para a impressora e marcar como impresso

### 2. Criar uma Edge Function para o polling do servico nativo
- Endpoint `GET /printer-queue?org_id=xxx` que retorna jobs pendentes
- Endpoint `PATCH /printer-queue` para marcar jobs como impressos
- Isso porque o Foreground Service nao tem acesso ao Supabase JS client

### 3. Registrar o plugin no Capacitor e expor para o TypeScript
- Criar a interface TypeScript do plugin
- Metodos: `startService(orgId, supabaseUrl, anonKey)` e `stopService()`

### 4. Integrar no Dashboard
- Quando o modo Bluetooth estiver ativo e `isNativePlatform()` for true, iniciar o servico automaticamente
- Adicionar botao de ligar/desligar o servico em segundo plano na aba Impressora
- Mostrar status do servico (ativo/inativo)

### 5. Rebuild do APK
- Apos as alteracoes, o usuario precisara gerar um novo APK com `npx cap sync && npx cap build android`

---

## Secao Tecnica

### Foreground Service (Java)
```text
android/app/src/main/java/.../PrinterForegroundService.java
- extends Service
- startForeground() com notificacao "Impressao ativa"
- ScheduledExecutorService com polling a cada 10s
- HTTP GET para edge function buscando jobs pendentes
- BLE write para a impressora (reusa UUIDs salvos em SharedPreferences)
- HTTP PATCH para marcar job como impresso
```

### Edge Function: `printer-queue`
```text
GET  ?org_id=xxx       -> retorna jobs pendentes (status='pendente', limit 5)
POST ?action=mark      -> body { id: "job_id" } marca como impresso
```

### Permissoes Android necessarias
```text
android/app/src/main/AndroidManifest.xml
- FOREGROUND_SERVICE
- FOREGROUND_SERVICE_CONNECTED_DEVICE
- BLUETOOTH, BLUETOOTH_ADMIN, BLUETOOTH_CONNECT
- INTERNET
- WAKE_LOCK
```

### Interface TypeScript
```text
src/lib/backgroundPrinter.ts
- startBackgroundPrinting(orgId: string): Promise<void>
- stopBackgroundPrinting(): Promise<void>
- isBackgroundPrintingActive(): Promise<boolean>
```

## Limitacoes
- Requer rebuild completo do APK (nao eh uma mudanca apenas web)
- O usuario precisara permitir a notificacao persistente do Android
- O Bluetooth precisa estar pareado antes de ativar o modo segundo plano
