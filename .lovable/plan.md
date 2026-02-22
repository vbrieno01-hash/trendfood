

# Melhorar o Footer da Landing Page

## O que adicionar

### 1. Layout em colunas
Organizar o footer em 3-4 colunas com informacoes uteis:

- **Coluna 1 - Marca**: Logo, descricao curta da TrendFood ("Sistema completo para seu negocio de alimentacao") e redes sociais (icones do Instagram, WhatsApp)
- **Coluna 2 - Produto**: Links para Funcionalidades, Planos, Como Funciona (ancoras para secoes da propria landing)
- **Coluna 3 - Suporte**: Links para Termos de Uso, Politica de Privacidade, Contato/WhatsApp
- **Coluna 4 - Contato**: Email de contato, link do WhatsApp com icone

### 2. Linha de redes sociais
Icones clicaveis para Instagram e WhatsApp (os mais relevantes para comercio de alimentacao no Brasil)

### 3. Linha de copyright
Manter o copyright atual na parte de baixo, separado por uma borda sutil

### 4. Visual
- Fundo escuro (`bg-muted/50` ou similar) para dar contraste com o restante
- Tipografia menor e cores suaves (`text-muted-foreground`)
- Responsivo: colunas em grid no desktop, empilhado no mobile

## Detalhes Tecnicos

### Arquivo modificado
- `src/pages/Index.tsx` - substituir o bloco `<footer>` atual (ultimas ~7 linhas antes do fechamento do componente)

### Estrutura do novo footer
```text
+--------------------------------------------------+
|  Logo + Descricao   |  Produto    |  Suporte      |
|  TrendFood           |  Funcional. |  Termos       |
|  "Sistema completo   |  Planos     |  Privacidade  |
|   para alimentacao"  |  Como Func. |  WhatsApp     |
|  [Insta] [WhatsApp]  |             |               |
+--------------------------------------------------+
|     (c) 2025 TrendFood. Feito com amor...         |
+--------------------------------------------------+
```

### Links internos (ancoras)
- Os links de "Funcionalidades", "Como Funciona" podem ser ancoras scroll-to-section ou links para `/planos`
- WhatsApp abre link externo `https://wa.me/NUMERO`
- Termos e Privacidade podem ser placeholders por enquanto (`#`)

### Componentes usados
- Icones do `lucide-react` (Instagram, MessageCircle para WhatsApp)
- Grid responsivo com Tailwind (`grid grid-cols-1 md:grid-cols-3`)
