
# Corrigir links de download APK/EXE no mobile

## Problema

Os links de download do APK e EXE usam o atributo `download` em tags `<a>` apontando para GitHub. Esse atributo e ignorado por navegadores em links cross-origin (dominio diferente), entao:

1. No mobile, o link abre a pagina do GitHub em vez de baixar o arquivo
2. Se a release nao existe no GitHub, mostra pagina 404

## Solucao

Duas mudancas no arquivo `src/components/dashboard/PrinterTab.tsx`:

### 1. Corrigir os atributos dos links

- Remover o atributo `download` (nao funciona cross-origin)
- Adicionar `target="_blank"` e `rel="noopener noreferrer"` para abrir em nova aba
- Isso garante que o GitHub processe o download corretamente no mobile

### 2. Adicionar fallback com verificacao

Criar uma funcao `handleDownload` que:
- Faz um `fetch` HEAD para verificar se a URL existe (status 200)
- Se existir, abre o link normalmente em nova aba
- Se retornar 404 ou erro, mostra um toast informando que o arquivo ainda nao esta disponivel, com instrucao para entrar em contato

Isso evita que o usuario veja a pagina 404 do GitHub.

## Secao Tecnica

### Arquivo: `src/components/dashboard/PrinterTab.tsx`

1. **Criar funcao `handleDownload`** no componente:

```typescript
const handleDownload = async (url: string, label: string) => {
  try {
    const res = await fetch(url, { method: "HEAD", mode: "no-cors" });
    window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};
```

Nota: como GitHub nao permite CORS em HEAD requests, a melhor abordagem e simplesmente abrir em nova aba sem o atributo `download`.

2. **Link do APK (linha ~226-236)**: Trocar de `asChild` + `<a download>` para um `Button` com `onClick` que abre `window.open(url, "_blank")`:

```tsx
<Button
  variant="outline"
  size="sm"
  className="h-9 gap-2"
  onClick={() => window.open("https://github.com/vbrieno01-hash/trendfood/releases/latest/download/trendfood.apk", "_blank", "noopener,noreferrer")}
>
  <Download className="w-4 h-4" />
  Baixar TrendFood.apk
</Button>
```

3. **Link do EXE (linha ~368-378)**: Mesma mudanca:

```tsx
<Button
  variant="outline"
  size="sm"
  className="h-9 gap-2"
  onClick={() => window.open("https://github.com/vbrieno01-hash/trendfood/releases/latest/download/trendfood.exe", "_blank", "noopener,noreferrer")}
>
  <Download className="w-4 h-4" />
  Baixar trendfood.exe
</Button>
```

## Importante

Para que os links funcionem, voce precisa ter criado pelo menos uma Release no GitHub com os arquivos `trendfood.apk` e `trendfood.exe` anexados. Sem a release, o link sempre retornara 404 independente do codigo.
