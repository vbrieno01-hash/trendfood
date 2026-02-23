

# Abrir no Login ao iniciar o APK

## O que sera feito

Duas mudancas simples, apenas para a versao APK (nao afeta o site web):

### 1. Redirecionar a rota "/" para "/auth" no APK
No `App.tsx`, quando detectar que esta rodando no Capacitor (plataforma nativa), redirecionar automaticamente da landing page para a tela de autenticacao.

### 2. Abrir na aba "Entrar" por padrao no APK
No `AuthPage.tsx`, detectar se esta no APK usando `Capacitor.isNativePlatform()`. Se sim, o `defaultValue` do componente Tabs muda de `"signup"` para `"login"`.

A aba "Criar conta" continua disponivel para quem precisar, mas o padrao no APK sera sempre "Entrar".

## Secao Tecnica

### App.tsx
- Importar `Capacitor` de `@capacitor/core`
- No componente `AppInner`, adicionar logica para redirecionar: se `Capacitor.isNativePlatform()` e a rota atual for `/`, navegar para `/auth`

### AuthPage.tsx (linha 238)
- Importar `Capacitor` de `@capacitor/core`
- Mudar `defaultValue="signup"` para `defaultValue={Capacitor.isNativePlatform() ? "login" : "signup"}`

Nenhuma mudanca no banco de dados necessaria.

