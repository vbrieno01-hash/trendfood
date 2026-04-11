

## Simplificar aba iFood para "Em Breve"

Substituir todo o conteúdo funcional da aba iFood (status, configuração de Merchant ID, instruções) por uma tela simples de "Em Breve", mantendo apenas um card centralizado com ícone, título e descrição informando que a integração está em desenvolvimento.

### Alteração

**`src/components/dashboard/IFoodTab.tsx`** — Reescrever o componente para exibir apenas:
- Titulo "Integração iFood" com subtitulo
- Um card centralizado com o emoji de moto, titulo "Em Breve" e texto explicando que a integração com o iFood está sendo finalizada
- Remover toda lógica de query, mutations, estado, e os cards de status/configuração/instruções
- Manter a prop `orgId` na interface para não quebrar onde é usado, mas sem utilizá-la internamente

Arquivo único modificado, sem mudanças no banco.

