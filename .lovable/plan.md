
# Redesign de Todas as Abas do Dashboard — Visual Profissional

## Diagnóstico por Aba

Analisando o código e as screenshots enviadas, os problemas são:

**MenuTab (Cardápio) — prioridade máxima:**
- Cards muito grandes (padding `p-3`, imagem `w-14 h-14`, texto grande) — não cabem muitos itens na tela
- Emoji do grupo ainda aparece dentro dos cards sem foto
- Cabeçalhos de categoria com emojis (`{group.emoji}`)
- Layout "lista" muito generoso em espaçamento, parece software dos anos 2010

**StoreProfileTab (Perfil da Loja):**
- Grade de emojis da loja: 12 botões de emojis circulares, muito infantil e genérica
- Formulário plano, sem seções/cards que agrupem campos relacionados
- Preview de cor primária ok, mas o entorno está sem hierarquia

**SettingsTab (Configurações):**
- Cards com bordas simples (`bg-card border border-border`) — sem personalidade
- "Zona de Perigo" tem ShieldAlert mas o card não tem suficiente destaque visual
- Seção de e-mail muito pequena e sem destaque

**MuralTab (Gerenciar Mural):**
- Cards de sugestão (`Card + CardContent p-4`) muito cheios de espaço
- Status badges com emojis (⏳ 🔍 ✅)
- Empty state com emoji 🗒️

**TablesTab (Mesas):**
- Empty state com emoji 🪑
- Cards de mesa ok estruturalmente mas poderia ser mais denso

## O Que Vai Mudar

### 1. MenuTab — Layout tabela/linha compacta

Transformar os cards grandes em **linhas compactas estilo lista de arquivo**, como Figma ou Linear mostram itens:

- Altura da linha: `py-2.5 px-3` (ao invés de `p-3`)
- Imagem: `w-10 h-10 rounded-md` (ao invés de `w-14 h-14`)
- Fonte do nome: `text-sm font-medium` sem badge grande
- Preço alinhado à direita em coluna fixa
- Switch menor
- Categoria header: só texto `text-xs uppercase tracking-wider text-muted-foreground` — sem emoji
- Sem imagem placeholder com emoji — usar ícone `ImageOff` do Lucide em cinza claro
- Resultado: 2-3x mais itens visíveis na tela ao mesmo tempo

### 2. StoreProfileTab — Remover grade de emojis / Agrupar em seções com cards

A grade de emojis é necessária para a funcionalidade, mas pode ser apresentada de forma mais contida:
- Tornar a seção "Emoji da loja" colapsável ou substituir por um select discreto
- Alternativamente: manter os botões mas reduzir para `w-9 h-9` e agrupar num container com `overflow-x-auto` numa linha horizontal scroll ao invés de grade 2D
- Agrupar campos em 3 seções visuais separadas por linha divisória:
  1. **Identidade** (Logo + Emoji + Nome + Descrição)
  2. **URL e Cor** (Slug + Cor primária + Preview)
  3. **Contato** (WhatsApp)
- Cada seção com título `text-xs uppercase tracking-wider text-muted-foreground mb-3`

### 3. SettingsTab — Tipografia mais forte, cards com mais personalidade

- Header da página com subtítulo dinâmico (e-mail do usuário ao lado do título)
- Card "Informações da conta": adicionar ícone `Mail` ao lado do e-mail, fundo muito sutil `bg-secondary/40`
- Card "Alterar senha": adicionar ícone `KeyRound` no header da seção
- Card "Zona de Perigo": borda `border-destructive/40`, fundo `bg-destructive/3`, e um parágrafo mais impactante
- Botões com `h-10` ao invés de `h-9`, mais peso

### 4. MuralTab — Status badges sem emoji, cards mais compactos

- Substituir `STATUS_BADGE` emojis por indicadores coloridos puros:
  - Pendente: ponto amarelo `●` CSS ou `div` redondo, label `"Pendente"`
  - Analisando: ponto azul, label `"Analisando"`
  - No Cardápio: ponto verde, label `"No Cardápio"`
- Cards de sugestão: reduzir `p-4` para `px-4 py-3`
- Empty state: ícone Lucide `MessageSquareDashed` ao invés de 🗒️

### 5. TablesTab — Empty state sem emoji

- Substituir `🪑` por ícone Lucide `LayoutGrid` ou `Grid3X3`
- Melhorar os quick links (Cozinha/Garçom) com fundo colorido sutil ao invés de só borda cinza

## Arquivos Afetados

| Arquivo | Mudança Principal |
|---|---|
| `src/components/dashboard/MenuTab.tsx` | Linhas compactas, sem emoji nas categorias, imagem menor |
| `src/components/dashboard/StoreProfileTab.tsx` | Emojis em linha horizontal scroll, seções agrupadas |
| `src/components/dashboard/SettingsTab.tsx` | Cards com mais personalidade, ícones, Zona de Perigo mais impactante |
| `src/components/dashboard/MuralTab.tsx` | Status badges sem emoji, cards compactos, empty state com ícone |
| `src/components/dashboard/TablesTab.tsx` | Empty state sem emoji, quick links melhorados |

Nenhuma mudança em banco de dados, rotas ou lógica de negócio.
