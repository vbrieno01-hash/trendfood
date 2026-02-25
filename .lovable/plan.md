

# Plano: Logo exclusiva no painel do dashboard

## O que será feito

### 1. Salvar a nova logo como `src/assets/logo-dashboard.png`
- Copiar a imagem enviada (chapéu de chef preto) para o projeto

### 2. Atualizar `src/pages/DashboardPage.tsx`
- Adicionar import: `import logoDashboard from "@/assets/logo-dashboard.png"`
- Trocar `logoIcon` por `logoDashboard` no `<img>` do sidebar

## O que NÃO muda
- Páginas inicial, login, planos e pedidos continuam com a logo atual (`logo-icon.png`)
- Apenas o sidebar do dashboard usa esta nova logo

## Seção técnica
```text
Arquivos criados: 1 (logo-dashboard.png)
Arquivos editados: 1 (DashboardPage.tsx — 2 linhas: import + src da img)
```

