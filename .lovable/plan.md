
# Centralizar e corrigir o gráfico "Últimos 7 dias"

## Problema identificado

Olhando a imagem, o gráfico está visivelmente deslocado para a direita. Isso ocorre por dois motivos combinados:

1. **Margem esquerda zero no gráfico**: `margin={{ top: 4, right: 16, left: 0, bottom: 0 }}` — sem margem à esquerda, os labels do eixo Y esquerdo (números de pedidos) são cortados ou empurram o conteúdo do gráfico para a direita.

2. **Largura do YAxis esquerdo não especificada**: sem `width` fixo no `YAxis`, o Recharts calcula automaticamente e pode criar desequilíbrio visual entre os dois eixos (esquerdo e direito).

3. **`max-w-4xl` no container**: limita a largura total do dashboard, mas não afeta diretamente o gráfico.

## Mudanças no arquivo `src/components/dashboard/HomeTab.tsx`

### 1. Aumentar a margem esquerda do `ComposedChart`
De: `margin={{ top: 4, right: 16, left: 0, bottom: 0 }}`  
Para: `margin={{ top: 4, right: 8, left: 8, bottom: 0 }}`

### 2. Definir `width` fixo nos dois `YAxis` para equilíbrio visual
- YAxis esquerdo: `width={35}` — espaço suficiente para números inteiros
- YAxis direito: `width={55}` — espaço para rótulos como `R$1000`

### 3. Remover `max-w-4xl` do container principal
Para que o gráfico use toda a largura disponível no painel, removendo a restrição artificial de largura que faz o layout parecer desequilibrado.

## Arquivo afetado

| Arquivo | O que muda |
|---|---|
| `src/components/dashboard/HomeTab.tsx` | Ajuste nas margens do `ComposedChart` e largura dos dois `YAxis` |
