

# Atualizar link de download do trendfood.exe

## Resumo
Trocar o link de download do `trendfood.exe` para apontar para o GitHub Releases do repositorio `vbrieno01-hash/trendfood`.

## Alteracao

**Arquivo:** `src/components/dashboard/SettingsTab.tsx` (linha 419)

Trocar:
```
https://trendfood.lovable.app/trendfood.exe
```

Por:
```
https://github.com/vbrieno01-hash/trendfood/releases/latest/download/trendfood.exe
```

Este link sempre aponta automaticamente para a versao mais recente do release.

## Tecnico

| Arquivo | Linha | Alteracao |
|---------|-------|-----------|
| `src/components/dashboard/SettingsTab.tsx` | 419 | Atualizar href do botao de download |

Apenas 1 arquivo precisa ser alterado. Nenhum outro local no codigo referencia o `trendfood.exe`.

