

# Teste Completo e Telefone Obrigatorio no Cardapio Online

## Resultado do Teste de Paginas

Todas as paginas foram testadas e estao carregando corretamente:

| Pagina | Status |
|--------|--------|
| `/` (Landing) | OK |
| `/auth` (Login/Cadastro) | OK - web abre em "Criar conta", APK abre em "Entrar" |
| `/planos` (Precos) | OK |
| `/termos` (Termos de Uso) | OK |
| `/privacidade` | OK |
| `/dashboard` | OK - push notifications integrado |
| `/unidade/:slug` (Cardapio online) | OK |
| `/unidade/:slug/mesa/:n` (Pedido mesa) | OK |
| `/cozinha` (KDS) | OK |
| `/garcom` | OK |
| `/motoboy` | OK |
| `/docs/impressora-termica` | OK |

Nenhum erro no console (apenas warnings do ambiente de preview, nao do app).

## Mudanca Necessaria: Telefone Obrigatorio

Atualmente o campo "Telefone" no checkout do cardapio online (`/unidade/:slug`) esta marcado como **(opcional)**. Sera alterado para **obrigatorio**.

### O que sera feito

1. **Mudar o label do campo telefone** de "(opcional)" para o asterisco vermelho obrigatorio `*`
2. **Adicionar estado de erro** `phoneError` para validacao
3. **Adicionar validacao** no `handleSendWhatsApp`: se `buyerPhone` estiver vazio, bloquear envio e mostrar mensagem de erro
4. **Incluir borda vermelha** no campo quando vazio na validacao
5. **Resetar erro** ao digitar e no reset do checkout

### Secao Tecnica

Arquivo: `src/pages/UnitPage.tsx`

Mudancas:

1. **Linha 66** - Adicionar estado:
```text
const [phoneError, setPhoneError] = useState(false);
```

2. **Linhas 269-271** - Adicionar validacao no handleSendWhatsApp:
```text
if (!buyerPhone.trim()) { setPhoneError(true); valid = false; } else setPhoneError(false);
```

3. **Linhas 910-922** - Alterar label e adicionar erro visual:
   - Trocar `(opcional)` por `*` vermelho
   - Adicionar `className` condicional com `phoneError ? "border-destructive" : ""`
   - Adicionar `onChange` que limpa o erro: `setPhoneError(false)`
   - Adicionar mensagem de erro abaixo do campo

4. **Linha 474** - Limpar `phoneError` no reset:
```text
setPhoneError(false); (dentro de resetCheckout, junto com os outros resets)
```

Nenhuma mudanca no banco de dados necessaria.

