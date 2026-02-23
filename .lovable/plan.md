

# Busca dinâmica de downloads APK e EXE via API do GitHub

## O que muda para voce

- Pode criar releases separadas: uma so com o APK, outra so com o EXE
- Ou colocar os dois na mesma release
- O dashboard encontra automaticamente o arquivo certo, nao importa em qual release ele esta
- Se o arquivo nao existir em nenhuma release, mostra um aviso em vez de abrir pagina 404

## Como funciona

Quando o usuario clica no botao de download, o sistema:

1. Consulta a API do GitHub para listar todas as releases do repositorio
2. Percorre cada release procurando o arquivo especifico (`trendfood.apk` ou `trendfood.exe`)
3. Ao encontrar, abre o link de download
4. Se nao encontrar em nenhuma release, mostra mensagem de erro

## Secao Tecnica

### Arquivo: `src/components/dashboard/PrinterTab.tsx`

1. **Adicionar estado de loading** para cada botao de download:

```typescript
const [apkLoading, setApkLoading] = useState(false);
const [exeLoading, setExeLoading] = useState(false);
```

2. **Criar funcao `findAssetUrl`** que busca o arquivo em todas as releases:

```typescript
const findAssetUrl = async (filename: string): Promise<string | null> => {
  const res = await fetch(
    "https://api.github.com/repos/vbrieno01-hash/trendfood/releases",
    { headers: { Accept: "application/vnd.github.v3+json" } }
  );
  if (!res.ok) return null;
  const releases = await res.json();
  for (const release of releases) {
    const asset = release.assets?.find((a: any) => a.name === filename);
    if (asset) return asset.browser_download_url;
  }
  return null;
};
```

3. **Criar funcao `handleDownload`** com loading e tratamento de erro:

```typescript
const handleDownload = async (filename: string, setLoading: (v: boolean) => void) => {
  setLoading(true);
  try {
    const url = await findAssetUrl(filename);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      toast.error(`Arquivo "${filename}" nao encontrado em nenhuma release.`);
    }
  } catch {
    toast.error("Erro ao buscar download. Tente novamente.");
  } finally {
    setLoading(false);
  }
};
```

4. **Atualizar botao do APK** (substituir o `window.open` atual):

```tsx
<Button
  variant="outline"
  size="sm"
  className="h-9 gap-2"
  disabled={apkLoading}
  onClick={() => handleDownload("trendfood.apk", setApkLoading)}
>
  {apkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
  {apkLoading ? "Buscando..." : "Baixar TrendFood.apk"}
</Button>
```

5. **Atualizar botao do EXE** (mesma mudanca):

```tsx
<Button
  variant="outline"
  size="sm"
  className="h-9 gap-2"
  disabled={exeLoading}
  onClick={() => handleDownload("trendfood.exe", setExeLoading)}
>
  {exeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
  {exeLoading ? "Buscando..." : "Baixar trendfood.exe"}
</Button>
```

### Nota sobre rate limit

A API publica do GitHub permite 60 requisicoes por hora sem autenticacao. Como so e chamada quando o usuario clica no botao, e mais que suficiente.

