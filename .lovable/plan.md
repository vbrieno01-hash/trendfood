
# Marcar "Integração com delivery" como "Em breve" na página de planos

## Problema

Na pagina `/planos`, o plano Enterprise lista "Integracao com delivery" como feature disponivel (com checkmark verde), mas essa funcionalidade ainda nao foi implementada. Precisa mostrar um indicador visual "Em breve" ao lado.

## Mudancas

### 1. `src/pages/PricingPage.tsx`

Alterar a lista de features do plano Enterprise para usar objetos ao inves de strings simples, permitindo marcar itens como "coming soon":

- Mudar `"Integração com delivery"` para `"Integração com delivery (em breve)"`

Alternativa mais elegante: usar um sufixo visual. Trocar a string por um formato que o PlanCard reconheca.

**Abordagem escolhida (simples e sem quebrar outros componentes):**
- Na lista de features do Enterprise (linha 80), alterar a string de `"Integração com delivery"` para `"Integração com delivery (em breve)"`

### 2. `src/components/pricing/PlanCard.tsx`

Atualizar a renderizacao de features para detectar o sufixo `(em breve)` e exibir um badge estilizado:

- No `map` de features (linhas 70-75), verificar se a string contem `(em breve)`
- Se sim, remover o sufixo do texto e adicionar um badge `<span>` com estilo `bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full` ao lado
- O icone de check para itens "em breve" sera trocado por um relogio (`Clock` do lucide) em cor muted

Resultado visual: em vez de `checkmark verde + "Integracao com delivery"`, aparecera `relogio cinza + "Integracao com delivery" + badge "Em breve"`.

### Arquivos afetados
- `src/pages/PricingPage.tsx` (1 linha)
- `src/components/pricing/PlanCard.tsx` (logica de renderizacao de features)
