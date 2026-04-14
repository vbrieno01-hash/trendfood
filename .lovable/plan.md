

## Remover quadrado interno dos estados vazios de Prontos e Pagamento

### Problema
Os painéis "Prontos" e "Pagamento" têm um card interno (`bg-card border border-border rounded-2xl`) nos estados vazios, criando um retângulo dentro do retângulo. O painel "Cozinha" não tem esse card extra — mostra o conteúdo direto.

### Alteração

**`src/components/dashboard/WaiterTab.tsx`**
- Linha 265: trocar `<div className="text-center py-12 bg-card border border-border rounded-2xl">` por `<div className="text-center py-20">` (igual ao Cozinha)
- Linha 412: trocar `<div className="text-center py-10 bg-card border border-border rounded-2xl">` por `<div className="text-center py-20">` (igual ao Cozinha)

Isso remove o quadrado extra interno e padroniza com o visual do painel Cozinha.

