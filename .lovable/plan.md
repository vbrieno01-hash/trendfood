

## Comanda Editavel na aba Impressora Termica

### O que sera feito

Adicionar uma secao "Comanda" na aba Impressora Termica com um editor visual do template do recibo. O cabecalho da loja e editavel (nome, endereco, contato, CNPJ), enquanto a secao do cliente e o rodape sao fixos e apenas exibidos como preview.

### Mudancas

#### 1. Banco de dados: adicionar coluna `cnpj`

Adicionar a coluna `cnpj` (text, nullable) na tabela `organizations`. Os demais campos do cabecalho ja existem: `name`, `store_address`, `whatsapp`.

```sql
ALTER TABLE public.organizations ADD COLUMN cnpj text;
```

#### 2. `src/hooks/useOrganization.ts`

Adicionar `cnpj` a interface `Organization` e ao SELECT da query.

#### 3. `src/components/dashboard/PrinterTab.tsx`

Adicionar uma nova secao "Comanda" com:

- **Cabecalho da Loja (editavel)**: 4 campos de Input para Nome da Loja, Endereco, Contato (WhatsApp) e CNPJ. Cada campo salva no banco ao perder o foco (onBlur). Os valores iniciais vem da organizacao.

- **Preview visual do recibo**: Um bloco estilizado como papel termico (fundo branco, fonte mono, borda) mostrando em tempo real como a comanda ficara:

```text
        NOME DA LOJA
     Endereco da loja
      Contato da loja
           CNPJ
__________________________________
      dd/mm/aaaa hh:mm
  SIMPLES CONFERENCIA DA CONTA
      RELATORIO GERENCIAL
 * * * NAO E DOCUMENTO FISCAL * * *
----------------------------------
1x Produto exemplo      R$ 10,00
----------------------------------
TOTAL:                  R$ 10,00
----------------------------------
Nome: (nome do cliente)
Tel: (telefone)
End.: (endereco)
Frete: R$ 0,00
Pgto: (forma)
CPF/CNPJ: (documento)
Obs: (observacao)
----------------------------------
  * Obrigado pela preferencia *
        Volte sempre!
          TrendFood
```

- A secao "Cliente" e "Rodape" aparecem no preview mas nao sao editaveis (sao fixos e preenchidos automaticamente em cada pedido).

#### 4. `src/lib/formatReceiptText.ts`

Atualizar a funcao `formatReceiptText` para incluir o novo layout:

- **Cabecalho**: Nome da loja, endereco, contato e CNPJ (quando preenchidos). Aceitar um novo parametro `storeInfo` com esses campos.
- **Sub-cabecalho fixo**: Data/hora, "SIMPLES CONFERENCIA DA CONTA", "RELATORIO GERENCIAL", "NAO E DOCUMENTO FISCAL".
- **Itens e Total**: Manter como esta.
- **Cliente**: Manter como esta.
- **Rodape fixo**: "Obrigado pela preferencia", "Volte sempre!", "TrendFood".

A assinatura da funcao mudara para:

```typescript
interface StoreInfo {
  name: string;
  address?: string;
  contact?: string;
  cnpj?: string;
}

export function formatReceiptText(
  order: PrintableOrder,
  storeInfo: StoreInfo | string,
  printerWidth?: "58mm" | "80mm"
): string
```

Se `storeInfo` for string (compatibilidade retroativa), trata como nome da loja apenas.

#### 5. Atualizar chamadas de `formatReceiptText`

Nos locais que chamam `formatReceiptText` (hooks/pages), passar o objeto `storeInfo` completo com os dados da organizacao em vez de apenas o nome.

### Resultado

- O lojista edita os dados da loja diretamente na aba Impressora Termica
- Ve um preview em tempo real de como a comanda ficara
- A secao do cliente e rodape sao fixos e automaticos
- O recibo impresso fica mais profissional com endereco, contato, CNPJ e mensagem de agradecimento

