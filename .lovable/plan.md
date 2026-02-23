

## Corrigir redirecionamento de login no APK

### Problema

O app Android esta configurado para carregar a URL de preview (`lovableproject.com`), que exige autenticacao na plataforma Lovable. Por isso, ao abrir o APK, o usuario e redirecionado para a pagina de login do Lovable.

### Solucao

Alterar o `capacitor.config.ts` para apontar para a URL publicada do app:

- **De:** `https://4930409c-277c-4049-bcfe-e466bb996cff.lovableproject.com?forceHideBadge=true`
- **Para:** `https://trendfood.lovable.app`

### Detalhes tecnicos

Arquivo: `capacitor.config.ts`

Apenas a propriedade `server.url` sera alterada. O resto da configuracao permanece igual.

### Passos apos a correcao

Voce precisara rodar no terminal do projeto:

```text
git pull
npx cap sync
```

Depois, gere o APK novamente no Android Studio (Build > Generate App Bundles or APKs > Build APK).

