

# Hospedar trendfood.exe no GitHub Releases

## Resumo
Atualizar o link de download do `trendfood.exe` no dashboard para apontar para o GitHub Releases, onde o arquivo binario sera hospedado de forma confiavel e versionada.

## Passo 1: Configurar o GitHub Release (voce faz manualmente)

1. Conecte o projeto ao GitHub (se ainda nao estiver): va em Settings > GitHub > Connect
2. No repositorio do GitHub, va em **Releases** > **Create a new release**
3. Crie uma tag (ex: `v1.0.0`), titulo "TrendFood Printer v1.0.0"
4. Arraste o arquivo `trendfood.exe` na area de upload
5. Clique em **Publish release**
6. Copie o link direto do arquivo (formato: `https://github.com/SEU-USUARIO/SEU-REPO/releases/latest/download/trendfood.exe`)

Usando `/releases/latest/download/` o link sempre aponta para a versao mais recente automaticamente.

## Passo 2: Atualizar o link no codigo (eu faco)

No arquivo `src/components/dashboard/SettingsTab.tsx`, trocar o link atual:

```
https://trendfood.lovable.app/trendfood.exe
```

Pelo link do GitHub Releases. Como ainda nao temos o link exato (depende do nome do usuario/repo no GitHub), vou usar um placeholder que voce me confirma depois, ou posso usar o formato generico com `/releases/latest/download/trendfood.exe`.

## Passo 3: Tambem atualizar na landing page (se houver)

Verificar se existe algum outro lugar no codigo com o mesmo link e atualizar tambem.

## Tecnico

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/dashboard/SettingsTab.tsx` | Trocar href do botao de download para URL do GitHub Releases |

