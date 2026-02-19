
# Substituir Mockup CSS do Celular pela Screenshot Real do Mobile

## Situação Atual

O mockup do celular em `src/components/landing/ShowcaseSection.tsx` (linhas 33–83) é construído 100% em CSS/HTML com status bar, header, tabs, chips e card de produto simulados.

O usuário enviou a screenshot real do dashboard mobile (`user-uploads://image-13.png`) — que mostra o painel "Burguer do Rei" com o card vermelho de "Faturamento Hoje R$ 880,00", cards de métricas e gráfico dos últimos 7 dias.

## O Que Será Feito

### 1. Salvar a imagem no projeto
```
user-uploads://image-13.png → public/mobile-screenshot.png
```
Usar `public/` para referência via URL direta, igual ao que foi feito com `dashboard-screenshot.png`.

### 2. Atualizar `ShowcaseSection.tsx`

Substituir todo o conteúdo interno do phone frame (linhas 40–82) por uma `<img>` com a screenshot real, mantendo:
- A div de posicionamento absoluto (right, bottom, width: 110)
- A moldura do phone frame (`rounded-2xl`, `border-2`, `border-gray-800`, `shadow-2xl`)
- Remover o `ChefHat` import se não for mais usado

O novo conteúdo do phone frame ficará:
```tsx
{/* Phone frame */}
<div className="rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-800">
  <img
    src="/mobile-screenshot.png"
    alt="Painel mobile TrendFood"
    className="w-full block"
    style={{ display: "block" }}
  />
</div>
```

- Sem `height` fixo — a imagem define a altura naturalmente pelo aspect ratio do celular
- `object-top` não é necessário pois queremos mostrar toda a tela do mobile
- A largura é controlada pela div pai (`width: 110`)

### 3. Limpar imports
Remover `import { ChefHat } from "lucide-react"` já que não será mais utilizado no componente.

## Arquivos Afetados

| Arquivo | Ação |
|---|---|
| `public/mobile-screenshot.png` | Criar — copiar do upload do usuário |
| `src/components/landing/ShowcaseSection.tsx` | Substituir mockup CSS do celular por `<img>` + remover import ChefHat |

Sem banco de dados, sem novos pacotes.
