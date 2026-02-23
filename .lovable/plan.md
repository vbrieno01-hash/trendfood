

## Corrigir App ID do Capacitor

O build foi concluido com sucesso, porem o Capacitor reportou um erro de validacao no App ID. O formato atual (`app.lovable.4930409c277c4049bcfee466bb996cff`) nao e valido para Android/iOS porque os segmentos nao podem comecar com numeros.

### O que sera feito

Alterar o arquivo `capacitor.config.ts` para usar um App ID valido no formato Java package:

- **De:** `app.lovable.4930409c277c4049bcfee466bb996cff`
- **Para:** `app.trendfood.delivery`

### Detalhes tecnicos

O App ID precisa seguir estas regras:
- Formato de pacote Java (ex: com.exemplo.app)
- Sem tracos
- Minimo dois segmentos separados por ponto
- Cada segmento comeca com letra
- Apenas caracteres alfanumericos e underscore

Arquivo alterado: `capacitor.config.ts` (apenas a linha do `appId`)

### Proximos passos apos a correcao

Voce precisara rodar no terminal:

```
npx cap add android
npx cap sync
npx cap open android
```

