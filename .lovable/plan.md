

## Correção dos Logos Escuros da Plataforma

### Problema Identificado

O arquivo `logo-dashboard.png` contém elementos **pretos** que ficam invisíveis em fundos escuros (sidebars do Dashboard e Admin). O mesmo logo é usado em 4 locais:

| Arquivo | Linha | Contexto | Problema |
|---------|-------|----------|----------|
| `DashboardPage.tsx` | 745 | Sidebar escura | Logo invisível |
| `AdminPage.tsx` | 451 | Sidebar escura | Logo invisível |
| `AdminPage.tsx` | 553 | Header mobile | Logo pouco visível |
| `Index.tsx` | 238, 521 | Header + footer | OK (fundo escuro com texto branco) |

---

### Solução

Substituir `logoDashboard` pelo logo PWA (`/pwa-192.png`) que tem **chapéu branco sobre fundo laranja** — visível em qualquer fundo.

### Arquivos a Modificar

1. **`src/pages/DashboardPage.tsx`** (linha 745)
   - Trocar `logoDashboard` por `"/pwa-192.png"`

2. **`src/pages/AdminPage.tsx`** (linhas 451 e 553)
   - Trocar `logoDashboard` por `"/pwa-192.png"` nas duas ocorrências da sidebar

3. **`src/pages/Index.tsx`** (linhas 238 e 521)
   - Manter ou trocar para consistência visual

---

### Resultado Esperado

Logos visíveis em todas as páginas, independente do tema ou fundo.

