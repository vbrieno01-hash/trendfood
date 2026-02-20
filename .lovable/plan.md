
# Adicionar "Indique o TrendFood" na sidebar do dashboard

## Resumo

Adicionar um botao destacado "Indique o TrendFood" na area inferior da sidebar (entre "Ver pagina publica" e "Sair"), com visual chamativo para incentivar o compartilhamento.

## Mudancas

### `src/pages/DashboardPage.tsx`

- Importar o icone `Share2` do lucide-react
- Adicionar um botao "Indique o TrendFood" na secao "Bottom actions" da sidebar, antes do link "Ver pagina publica"
- O botao tera estilo destacado (cor primaria/vermelha, com fundo semi-transparente) para se diferenciar dos outros itens
- Ao clicar, abre o WhatsApp com a mensagem pre-formatada de indicacao (mesmo comportamento do SettingsTab)
- Opcionalmente, adicionar um pequeno tooltip ou subtexto

### Visual

O botao ficara posicionado assim na sidebar:

```text
  [Instalar App]          (se disponivel)
  [Indique o TrendFood]   <-- NOVO, destacado em vermelho/primary
  [Ver pagina publica]
  [Sair]
```

Estilo: fundo `bg-primary/10` com texto `text-primary` e hover `hover:bg-primary/20`, diferenciando dos demais links cinzas.

### Nenhuma alteracao no banco de dados

Apenas mudanca visual na sidebar.
