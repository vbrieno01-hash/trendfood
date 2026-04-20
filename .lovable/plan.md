
## Diagnóstico — por que está se misturando

A "Cor secundária (textos de destaque)" hoje faz **duas coisas conflitantes ao mesmo tempo** e nenhuma delas tem nome claro:

1. **Cor do segundo tom do gradiente do banner** — quando você escolhe "Gradiente" no estilo do cabeçalho, ela vira a segunda cor da faixa (ex: roxo → vermelho)
2. **Cor de texto de destaque** (ex: preço dos produtos)

Aí acontece o que você viu: você escolheu vermelho pra "texto de destaque" pensando que era só fonte → o banner também ficou vermelho no gradiente → o nome da loja em branco "some" no degradê → bagunça total.

Além disso a UI não deixa claro **onde cada cor vai aparecer** no storefront, então é tentativa e erro.

## Plano — separar cada cor em um campo próprio com nome e preview claros

### 1. Quebrar a "Cor secundária" em 3 campos independentes

| Campo novo | Função única e clara | Default |
|---|---|---|
| `gradient_color` | **Segunda cor do gradiente** do cabeçalho (só usada se "Gradiente" estiver selecionado) | igual ao primary, mais escuro |
| `accent_text_color` | **Cor de textos de destaque** (preços, badges, valores) | `#1e293b` (preto suave) |
| `header_text_color` | **Cor do texto do nome da loja no cabeçalho** (resolve "some no banner") | `#ffffff` (branco) |

Cada um com seu próprio color picker + input de hex + label explicando exatamente onde aparece.

### 2. Mostrar/esconder campos conforme contexto

- O campo "Segunda cor do gradiente" só aparece quando "Estilo do cabeçalho" = **Gradiente** (some nos outros casos pra não confundir)
- O campo "Cor do texto do cabeçalho" só aparece quando "Estilo do cabeçalho" = **Sólido** ou **Gradiente** (no "Transparente" o texto usa a cor primária automaticamente)

### 3. Botão "Restaurar padrão" em cada campo de cor

Pequeno botão `↺` ao lado de cada cor pra voltar ao default — assim se o lojista bagunçar consegue resetar **só aquela cor**, sem mexer nas outras.

### 4. Mini-preview ao lado de cada cor (não só um preview gigante no fim)

Cada campo de cor mostra um mini-card 80x40px do lado direito demonstrando **exatamente** onde aquela cor é aplicada:
- Cor primária → mini banner com nome da loja
- Segunda cor do gradiente → mini faixa com gradiente real
- Cor do texto do cabeçalho → mini banner com texto na cor escolhida
- Cor de destaque → mini badge "R$ 19,90" na cor escolhida

Resolve o problema de "não sei qual cor mexe em quê".

### 5. Validação de contraste (aviso amigável)

Quando o lojista escolhe uma combinação ruim (ex: texto branco em fundo branco), aparece um avisinho amarelo abaixo:
> ⚠️ Contraste baixo — esse texto pode ficar difícil de ler

Não bloqueia, só avisa.

### 6. Migração de dados existentes (sem quebrar lojas atuais)

- Quem já tem `secondary_color` salvo: copiar o valor pra `gradient_color` E `accent_text_color` (mantém visual atual)
- `header_text_color` default = `#ffffff` pra todo mundo (que era o comportamento atual)
- Sem migração SQL — tudo no JSONB `theme_config`, retro-compatível

### 7. Aplicar os novos campos no storefront público

`UnitPage.tsx`:
- Gradiente do banner usa `gradient_color` (não mais `secondary_color`)
- Texto do nome da loja no banner usa `header_text_color`
- Preços e badges de destaque usam `accent_text_color` (criar variável CSS `--org-accent-text`)

## Arquivos a editar

- `src/hooks/useOrganization.ts` — adicionar `gradient_color`, `accent_text_color`, `header_text_color` na interface `ThemeConfig`
- `src/components/dashboard/StoreProfileTab.tsx` — refazer a seção "Tema Visual" com os 3 campos separados, mini-previews ao lado, condicional de exibição, botão restaurar e aviso de contraste
- `src/pages/UnitPage.tsx` — usar os novos campos no header e expor `--org-accent-text`
- Lógica de fallback: se `gradient_color` não existir, usa `secondary_color` (compat com lojas antigas)

## Resultado esperado

- Cada cor tem **um nome**, **um lugar** e **um mini-preview** mostrando exatamente onde vai aparecer
- Mexer em "cor de destaque" **nunca mais** afeta o banner
- Texto do banner não some mais (campo dedicado)
- Lojista pode resetar uma cor individualmente sem perder o resto
- Lojas antigas continuam exatamente iguais (migração automática no JSONB)
