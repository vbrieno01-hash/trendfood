

## Plano: Termos de Uso + Checkbox de Aceite no Checkout

### 1. Atualizar `/termos` com o novo conteúdo
- Reescrever `src/pages/TermsPage.tsx` com o texto fornecido (5 seções: O Serviço, Planos e Pagamentos, Política de Reembolso, Indisponibilidade, Isenção de Responsabilidade).

### 2. Criar tabela `terms_acceptances` no banco
- Colunas: `id`, `organization_id`, `user_id`, `ip_address`, `accepted_at`, `user_agent`
- RLS: owner pode inserir e ler, admin pode ler

### 3. Criar edge function `get-client-ip`
- Retorna o IP do request (`request.headers.get("x-forwarded-for")` ou similar)
- Necessário porque o frontend não tem acesso ao IP real do usuário

### 4. Adicionar checkbox + modal de termos no `CardPaymentForm.tsx`
- Estado `termsAccepted` (boolean) e `termsDialogOpen` (boolean)
- Antes do botão "Assinar", adicionar checkbox com texto: "Li e concordo com os **Termos de Uso**" onde "Termos de Uso" é um link que abre um Dialog/ScrollArea com o conteúdo completo dos termos (sem navegar para outra página)
- Botão de submit fica `disabled` enquanto `!termsAccepted`
- No `handleSubmit`, antes de processar pagamento: chamar `get-client-ip`, depois inserir registro em `terms_acceptances` com org_id, user_id, ip e timestamp

### 5. Mesmo checkbox no `PixPaymentTab.tsx`
- Mesma lógica: checkbox obrigatório + modal dos termos
- Botão "Pagar via PIX" fica disabled sem aceite
- Registra aceite no banco antes de gerar o PIX

### Detalhes Técnicos
- O conteúdo dos termos será extraído para um componente reutilizável `TermsContent` usado tanto na página `/termos` quanto nos modais do checkout
- A edge function `get-client-ip` é simples: lê `x-forwarded-for` ou `x-real-ip` dos headers e retorna como JSON
- O insert em `terms_acceptances` usa o Supabase client autenticado (o usuário já está logado no checkout de assinatura)

