

# Plano: Testar CheckoutPage com rota temporária

## Alterações

### 1) Criar página wrapper `src/pages/CheckoutTestPage.tsx`

Página temporária que renderiza `CheckoutPage` com dados mock:
- 4 itens de exemplo (Hambúrguer, Refrigerante, Batata Frita, Açaí)
- `onConfirm` exibe toast com dados submetidos
- `onBack` usa `useNavigate(-1)`

### 2) Editar `src/App.tsx`

- Importar `CheckoutTestPage`
- Adicionar rota `/checkout-test` antes do catch-all

### 3) Testar via browser

- Navegar para `/checkout-test` em desktop (1920x1080) e mobile (390x844)
- Verificar layout responsivo, seleção de pagamento PIX, e placeholder QR Code
- Testar troca entre métodos de pagamento

## Nota

A rota `/checkout-test` é temporária para validação. Pode ser removida após os testes.

