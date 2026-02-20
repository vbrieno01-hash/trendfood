
# Mostrar "Instalar App" sempre na sidebar

## Resumo

Atualmente o botao "Instalar App" so aparece quando o navegador dispara o evento `beforeinstallprompt` (Chrome/Edge). Para quem usa Safari ou ja instalou, o botao fica invisivel. A ideia e deixar o botao sempre visivel na area inferior da sidebar, e quando o prompt nativo nao estiver disponivel, mostrar instrucoes de como instalar manualmente.

## Mudancas

### `src/pages/DashboardPage.tsx`

- Remover a condicao `{installPrompt && !appInstalled && (...)}` que esconde o botao
- Mostrar o botao "Instalar App" sempre (exceto se ja instalado via `appInstalled`)
- Quando `installPrompt` estiver disponivel: manter o comportamento atual (prompt nativo)
- Quando `installPrompt` NAO estiver disponivel: ao clicar, mostrar um toast com instrucoes simples, tipo: "No navegador, toque nos 3 pontinhos (ou botao Compartilhar no iPhone) e selecione 'Instalar app' ou 'Adicionar a tela inicial'."
- Posicionar o botao antes do "Indique o TrendFood" na ordem da sidebar

### Ordem final na sidebar

```text
[Instalar App]           <-- sempre visivel
[Indique o TrendFood]    <-- destacado
[Ver pagina publica]
[Sair]
```

### Nenhuma alteracao no banco de dados

Apenas mudanca visual e logica no frontend.
