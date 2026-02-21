

# Secao "Configuracao de Impressao" no perfil do lojista

## Resumo

Adicionar uma nova secao visual no `SettingsTab` chamada **"Configuracao de Impressao"**, logo apos a secao de Impressora existente. Essa secao exibe o ID da organizacao em destaque, um botao para baixar o `trendfood.exe` e instrucoes claras de uso.

## Alteracoes

### Arquivo: `src/components/dashboard/SettingsTab.tsx`

Adicionar uma nova secao (card com borda) entre a secao "Impressora" e a secao "Alterar senha", contendo:

1. **Cabecalho**: icone de Printer + titulo "Configuracao de Impressao"
2. **ID da Loja em destaque**: campo somente-leitura com `organization.id` em fonte monospacada, com botao de copiar ao lado (mesmo padrao do campo de compartilhamento existente)
3. **Botao de download**: "Baixar trendfood.exe" com icone de download, apontando para um arquivo hospedado (inicialmente um link placeholder `https://trendfood.lovable.app/trendfood.exe` que pode ser atualizado depois)
4. **Instrucao**: texto orientativo -- "Baixe o programa, abra-o e digite o ID acima para ativar a impressao automatica."

### Detalhes tecnicos

- O `organization?.id` ja esta disponivel via `useAuth()` no componente
- Icones utilizados: `Printer` (ja importado), `Copy` (ja importado), `Download` (sera importado de `lucide-react`)
- Estilo segue o mesmo padrao dos cards existentes: `rounded-xl border border-border overflow-hidden` com cabecalho `bg-secondary/30`
- Botao de copiar usa `navigator.clipboard.writeText` + `toast.success` (mesmo padrao ja existente na secao "Indique o TrendFood")

