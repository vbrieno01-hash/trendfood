
# Atualização da Landing Page — Cópia Profissional e Persuasiva

## O que muda

Apenas o arquivo `src/pages/Index.tsx` será editado. Não há mudança de banco de dados, autenticação ou componentes compartilhados.

---

## Seção Hero — Alterações de conteúdo

### H1 (Título Principal)
- **Antes**: "Seu cardápio criado / pelos seus clientes"
- **Depois**: "Transforme o desejo dos seus clientes / em lucro real com a TrendFood."
  - "TrendFood" destacado com `text-primary` (laranja vibrante do projeto, já definido como `hsl(24 95% 53%)` no CSS)

### Subtítulo (parágrafo principal)
- **Antes**: "Crie uma página pública para seu estabelecimento..."
- **Depois**: "Descubra exatamente o que seu público quer comer. Crie seu mural de sugestões em segundos, receba votos em tempo real e turbine seu cardápio com os lanches que já nascem campeões de vendas."

### Texto de Apoio (parágrafo secundário — novo)
Um novo parágrafo menor será adicionado abaixo do subtítulo, antes dos botões:
> "Faça como centenas de empreendedores que entenderam os desafios de inovar no setor de alimentação. Tenha uma equipe de inteligência de dados trabalhando para sua lanchonete, 24 horas por dia."

### Badge (acima do H1)
- **Antes**: "Novo jeito de ouvir seus clientes"
- **Depois**: "Inteligência de dados para o seu negócio" — alinhado com o novo posicionamento premium

### Botão de Ação Principal
- **Antes**: "Criar minha conta grátis"
- **Depois**: "Começar a Lucrar Agora" (mantém o link `/auth` e o ícone `ArrowRight`)

---

## Ajustes de Design aplicados

| Elemento | Detalhe |
|---|---|
| Fonte | Já é Inter/sans-serif via Tailwind — sem mudança necessária |
| "TrendFood" no H1 | Encapsulado em `<span className="text-primary">` (laranja `#f97316`) |
| Contraste mobile | Subtítulo usa `text-muted-foreground` sobre `bg-background` claro — contraste AA já garantido |
| Texto de apoio | `text-sm md:text-base text-muted-foreground` para hierarquia visual clara |
| Espaçamento | `mb-4` entre subtítulo e texto de apoio, `mb-8` antes dos botões |

---

## Seção CTA (rodapé laranja)

O texto do CTA final também será atualizado para coerência com o novo posicionamento:
- **Título**: "Pronto para transformar seu cardápio?"
- **Subtítulo**: "Junte-se a centenas de empreendedores. Comece grátis, sem cartão de crédito."
- **Botão**: "Começar a Lucrar Agora"

---

## Arquivo modificado

| Arquivo | Tipo de mudança |
|---|---|
| `src/pages/Index.tsx` | Conteúdo de texto + estrutura da seção Hero e CTA |

Nenhuma dependência nova. Nenhuma mudança de banco de dados.
