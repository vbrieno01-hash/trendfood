

## Adicionar botao de download do APK via GitHub Releases

Seguindo o mesmo padrao do botao "Baixar trendfood.exe" na secao Desktop, vamos adicionar um botao de download do APK na secao Bluetooth/Mobile.

### O que muda

**`src/components/dashboard/PrinterTab.tsx`**:

1. Dentro do bloco condicional `printMode === "bluetooth"` (secao "Impressora Bluetooth"), adicionar um botao de download do APK com o link do GitHub Releases, usando o mesmo padrao do .exe:

```
<a href="https://github.com/vbrieno01-hash/trendfood/releases/latest/download/trendfood.apk" download>
  <Download /> Baixar TrendFood.apk
</a>
```

2. Adicionar uma descricao curta abaixo, como: "Baixe e instale o app Android para imprimir via Bluetooth."

### Padrao seguido

Identico ao botao de download do `.exe` que ja existe na secao Desktop — mesmo estilo de `Button variant="outline"`, icone `Download`, e link apontando para `/releases/latest/download/`.

