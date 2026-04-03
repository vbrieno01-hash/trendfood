

## Plano: Adicionar seção explicativa no Programa de Fidelidade

### Mudança
Adicionar um bloco explicativo abaixo dos campos de configuração (após o botão Salvar) com um resumo dinâmico e claro de como o programa funciona, usando os valores configurados pelo lojista.

### Conteúdo da explicação
Uma caixa com fundo sutil contendo:

**"Como funciona para seus clientes"**
1. O cliente faz um pedido e informa o telefone
2. A cada R$X gastos, ele ganha 1 ponto automaticamente
3. Quando acumular Y pontos, pode trocar por um desconto de R$Z (ou Z%)
4. O desconto é aplicado no próximo pedido
5. Os pontos são identificados pelo telefone — sem cadastro extra

**Exemplo prático** (dinâmico com os valores configurados):
> "Se um cliente gastar R$150 em pedidos e você configurou R$30 por ponto, ele terá 5 pontos. Com 40 pontos para resgate, ele precisa gastar R$1.200 no total para ganhar um desconto de R$20."

### Arquivo modificado
| Arquivo | Mudança |
|---------|---------|
| `src/components/dashboard/LoyaltyTab.tsx` | Adicionar bloco explicativo após o botão Salvar, dentro do card de configuração, com texto dinâmico baseado nos valores dos inputs |

