

## Converter APK para modo standalone (app completo)

### O que muda

O app vai carregar as telas diretamente do APK em vez de abrir um site no navegador. Os dados (pedidos, cardapio, clientes) continuam vindo da nuvem automaticamente.

### O que continua funcionando

- Pedidos dos clientes em tempo real
- Impressao termica via Bluetooth (funciona ainda melhor no modo nativo)
- Cardapio, cozinha, caixa, relatorios
- Pagamentos PIX
- Tudo que depende de dados na nuvem

### Mudanca tecnica

Arquivo: `capacitor.config.ts`

Remover a secao `server` inteira, deixando apenas:

```text
appId: "app.trendfood.delivery"
appName: "TrendFood"
webDir: "dist"
plugins: { ... }
```

### Passos apos a correcao (no seu computador)

1. `git pull` — baixar a alteracao
2. `npm run build` — gerar os arquivos do app
3. `npx cap sync` — copiar os arquivos para o projeto Android
4. No Android Studio: Build > Build APK

### Quando precisa gerar novo APK

- Mudancas de tela/layout/design: precisa novo APK
- Mudancas de dados (produtos, pedidos, precos): atualizam sozinhos pela nuvem

