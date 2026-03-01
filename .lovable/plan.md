

## Plano: Adicionar explicação visual na seção "Ganhe Desconto"

Adicionar um banner informativo no `ReferralSection.tsx`, logo abaixo do card de compartilhamento, explicando como funciona a mecânica de bônus.

**Arquivo: `src/components/dashboard/ReferralSection.tsx`**

Inserir um bloco visual (estilo `Alert` com ícone de informação) entre o card de compartilhamento e o histórico de bônus, com o texto:

> **Como funciona?**
> Seus dias de bônus são creditados automaticamente quando o amigo indicado **comprar um plano pago**. O simples cadastro já conta como indicação, mas o bônus só é liberado após o primeiro pagamento.

Usar o componente `Info` do Lucide como ícone e estilizar com cores suaves (`bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800`).

