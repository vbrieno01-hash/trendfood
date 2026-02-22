

# Corrigir botao "Parear impressora" que nao responde ao clique

## Problema

O botao "Parear impressora" usa `disabled={!btSupported}`. Dentro do iframe de preview do Lovable (e em navegadores sem Web Bluetooth), `isBluetoothSupported()` retorna `false`, deixando o botao desabilitado. Porem, visualmente ele parece normal -- o usuario clica e nada acontece, sem feedback.

## Solucao

### 1. `src/components/dashboard/KitchenTab.tsx`

- Remover o `disabled` do botao para que o click handler sempre execute
- No `onClick`, verificar se `btSupported` e `false` e mostrar um toast orientando o usuario a abrir a URL publicada diretamente no Google Chrome
- Se `btSupported` for `true`, chamar `onPairBluetooth()` normalmente
- Adicionar estilo visual (opacidade reduzida) quando `btSupported` e `false`

### 2. `src/components/dashboard/SettingsTab.tsx`

- Aplicar a mesma logica: remover `disabled` e adicionar handler com toast de orientacao quando Bluetooth nao esta disponivel

### 3. `src/pages/KitchenPage.tsx`

- Aplicar a mesma logica na pagina standalone da cozinha (paridade entre as interfaces)

## Detalhes tecnicos

```typescript
// Em vez de disabled={!btSupported}, usar:
onClick={() => {
  if (!btSupported) {
    toast.error("Bluetooth nao disponivel neste navegador", {
      description: "Abra trendfood.lovable.app diretamente no Google Chrome.",
      duration: 6000,
    });
    return;
  }
  onPairBluetooth?.();
}}
className={`... ${!btSupported ? "opacity-50" : ""}`}
```

## Arquivos alterados
- `src/components/dashboard/KitchenTab.tsx`
- `src/components/dashboard/SettingsTab.tsx`
- `src/pages/KitchenPage.tsx`

