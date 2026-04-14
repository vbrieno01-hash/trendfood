

## Busca rápida na sidebar do Dashboard

### O que será feito

Adicionar um campo de busca no topo da navegação da sidebar (logo abaixo do OrgSwitcher). Conforme o dono digita, os grupos e itens são filtrados em tempo real — mostrando apenas os que contêm o texto buscado (no label). Se o campo estiver vazio, tudo aparece normalmente.

### Mudanças em `src/pages/DashboardPage.tsx`

1. **Novo estado**: `const [sidebarSearch, setSidebarSearch] = useState("")`
2. **Campo de busca**: Inserir um `<input>` com ícone de lupa entre o OrgSwitcher (linha 781) e o `<nav>` (linha 784), estilizado para combinar com o fundo escuro da sidebar
3. **Filtro dos grupos**: Dentro do `<nav>`, filtrar `sidebarGroups` para mostrar apenas grupos que tenham pelo menos um item cujo `label` contenha o texto digitado (case-insensitive). Dentro de cada grupo visível, filtrar os itens também. O botão "Home" sempre aparece se "home" bater na busca ou se o campo estiver vazio
4. **Limpar busca ao trocar de aba**: No `handleTabChange`, limpar o campo (`setSidebarSearch("")`)

### Resultado
- Campo de busca discreto no topo da sidebar
- Filtragem instantânea conforme digita
- Encontra qualquer aba em segundos sem precisar rolar

