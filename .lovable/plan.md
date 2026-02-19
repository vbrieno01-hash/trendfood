
# Confirmação de Endereço no Checkout

## O Problema
O campo de endereço aparece só uma vez no drawer de checkout. Se o cliente errar o endereço (digitar rua errada, número trocado etc.), o motoboy vai para o endereço errado sem nenhuma verificação.

## O Que Vai Mudar

### Campo duplicado no formulário
Logo após o campo "Endereço (opcional)", vai aparecer um segundo campo:

**"Confirme o Endereço"** — com texto de apoio dizendo "Digite novamente para confirmar"

Se o cliente preencher o primeiro endereço mas deixar o segundo em branco (ou diferente), o formulário bloqueia o envio e exibe uma mensagem de erro em vermelho.

Se o endereço estiver vazio nos dois campos, tudo segue normal (endereço continua opcional).

### Lógica de Validação
```
SE address está preenchido E addressConfirm está diferente de address
  → bloquear envio
  → mostrar erro: "Os endereços não conferem"
```

### Reset do formulário
Após enviar o pedido via WhatsApp, o campo `addressConfirm` também é limpo junto com os demais campos.

## Arquivo Afetado

| Arquivo | Linhas | Ação |
|---|---|---|
| `src/pages/UnitPage.tsx` | 215–248 | Adicionar validação de endereços na função `handleSendWhatsApp` |
| `src/pages/UnitPage.tsx` | 613–624 | Adicionar campo "Confirme o Endereço" após o campo de endereço |
| `src/pages/UnitPage.tsx` | 242–248 | Limpar `addressConfirm` no reset |

## Resultado Visual

```
Endereço (opcional)
[ Para entrega, informe o endereço ]

Confirme o Endereço
[ Digite novamente para confirmar  ]
⚠ Os endereços não conferem         ← aparece só se houver divergência
```

Sem banco de dados, sem migrações — é uma mudança puramente de interface no formulário de checkout.
