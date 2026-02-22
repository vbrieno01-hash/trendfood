

# Renovar a Landing Page - Posicionamento competitivo

## Objetivo
Reposicionar a landing page para destacar as vantagens competitivas do TrendFood frente a plataformas como iFood: zero taxas, preco acessivel, controle total, entregas com motoboys proprios, impressao termica, e menos stress operacional.

## Alteracoes no arquivo `src/pages/Index.tsx`

### 1. Hero Section - Mensagem mais agressiva e competitiva

**Antes**: "Gerencie seu negocio inteiro. Do pedido ao caixa."
**Depois**: "Zero taxas. Zero comissao. Seu negocio, seu lucro." com subtitulo reforando que nao precisa pagar 27% pra ninguem.

- Badge: "Zero taxas sobre vendas"
- Subtitulo: explicar que diferente de marketplaces, aqui o dinheiro fica todo com o lojista
- Atualizar os proofBadges para incluir: "0% comissao", "Motoboys proprios", "Impressao termica", "PIX integrado", "Sem app para baixar"

### 2. Nova secao: "TrendFood vs Marketplaces" (entre Problem e How it Works)

Uma secao visual de comparacao lado a lado com 2 colunas:

| | Marketplaces (iFood, etc) | TrendFood |
|---|---|---|
| Comissao por venda | 12% a 27% | 0% |
| Dados dos clientes | Ficam com a plataforma | Sao seus |
| Cardapio | Padronizado | Personalizado |
| Delivery | Motoboy da plataforma (caro) | Seus motoboys, suas regras |
| Impressao de pedidos | Nao tem | Impressora termica integrada |
| Controle de caixa | Nao tem | Completo com abertura/fechamento |
| Custo mensal | Comissao variavel | A partir de R$ 0/mes |

Estilo visual: tabela com fundo vermelho claro nos itens negativos do marketplace, e verde nos itens positivos do TrendFood, com icones de X e Check.

### 3. Nova secao: "Calculadora de economia" (apos comparacao)

Uma mini calculadora interativa onde o lojista digita quanto fatura por mes e ve quanto economizaria saindo do iFood:
- Input: "Quanto voce fatura por mes no iFood?"
- Resultado: "Voce perde ate R$ X,XXX por mes em comissoes. Com o TrendFood, esse dinheiro fica com voce."
- Slider ou input com valor padrao de R$ 10.000
- Calculo: valor * 0.27 (taxa maxima) e valor * 0.12 (taxa minima)
- Visual impactante com o valor em destaque vermelho

### 4. Atualizar features para incluir Motoboys

Adicionar um novo card na lista de features:
- Icone: Bike
- Titulo: "Gestao de Motoboys"
- Descricao: "Cadastre motoboys, atribua entregas, acompanhe em tempo real e controle pagamentos."

### 5. Atualizar secao de problemas

Trocar o terceiro problema de "Sem controle do que vende" para algo sobre taxas de marketplace:
- Titulo: "Pagando ate 27% de comissao"
- Descricao: "Cada venda no iFood, desconto pesado. Final do mes, o lucro sumiu em taxas que voce nem ve."
- Imagem: manter foto de planilha/financeiro

### 6. CTA final mais agressivo

Atualizar o texto do CTA final:
- Titulo: "Pare de pagar comissao. Comece hoje."
- Subtitulo: "Mesmo sistema, zero taxa. Configure em minutos e veja a diferenca no seu caixa."

### 7. Componente da calculadora

Criar um novo componente `src/components/landing/SavingsCalculator.tsx`:
- Input controlado com formatacao de moeda (R$)
- Estado local para o valor digitado
- Calculo em tempo real mostrando economia minima (12%) e maxima (27%)
- Visual com card destacado, numeros grandes em vermelho/verde
- Botao CTA "Comecar Gratis" abaixo do resultado

### 8. Componente da comparacao

Criar `src/components/landing/ComparisonSection.tsx`:
- Tabela responsiva com 2 colunas (Marketplace vs TrendFood)
- Icones Check (verde) e X (vermelho) em cada linha
- Badge "Gratis" ou "Incluso" nos itens do TrendFood
- Design limpo e profissional com bordas arredondadas

## Resumo de arquivos

| Arquivo | Acao |
|---------|------|
| `src/pages/Index.tsx` | Atualizar hero, problemas, features, CTA, adicionar novas secoes |
| `src/components/landing/ComparisonSection.tsx` | Criar - secao comparativa |
| `src/components/landing/SavingsCalculator.tsx` | Criar - calculadora de economia |

Nenhuma migracao ou alteracao de banco necessaria.
