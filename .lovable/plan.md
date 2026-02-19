
# Substituir Mockup CSS pela Screenshot Real do Dashboard

## Situação Atual

O arquivo `src/components/landing/ShowcaseSection.tsx` ainda usa o mockup em HTML/CSS (linhas 19–97). A imagem enviada pelo usuário (`user-uploads://image-12.png`) nunca foi salva no projeto — a pasta `src/assets/` está vazia.

## O que Será Feito

### 1. Salvar a imagem no projeto
Copiar `user-uploads://image-12.png` → `public/dashboard-screenshot.png`

(Usar `public/` em vez de `src/assets/` para evitar problema de import de binário com Vite — referenciada via URL `/dashboard-screenshot.png`)

### 2. Atualizar `ShowcaseSection.tsx`

Substituir o bloco "App body" (linhas 18–97), que contém o mockup CSS com sidebar + métricas + gráfico, por uma simples tag `<img>` com a screenshot real:

```tsx
{/* App body - Screenshot real do dashboard */}
<div className="overflow-hidden" style={{ height: 300 }}>
  <img
    src="/dashboard-screenshot.png"
    alt="Painel TrendFood - Dashboard de vendas"
    className="w-full h-full object-cover object-top"
  />
</div>
```

- `object-cover`: preenche toda a área sem distorcer
- `object-top`: mostra a parte de cima da imagem (header + card de faturamento + métricas)
- `height: 300`: mantém a mesma altura do mockup anterior

### O que Permanece Intacto
- Moldura do laptop (barra de título macOS com 3 bolinhas)
- Base do laptop (haste cinza)
- Celular sobreposto no canto inferior direito (mockup do cardápio)
- Textos laterais com badges e setas

## Arquivos Afetados

| Arquivo | Ação |
|---|---|
| `public/dashboard-screenshot.png` | Criar — copiar do upload do usuário |
| `src/components/landing/ShowcaseSection.tsx` | Substituir linhas 18–97 por `<img>` |

Sem banco de dados, sem novos pacotes.
