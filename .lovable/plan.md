

## Sincronizacao global das configuracoes de impressora + comanda por loja

### Regra

- **Configuracoes de impressora** (modo de impressao, largura, etc.): atualizam **todas as unidades** do mesmo proprietario.
- **Comanda** (nome, endereco, contato, CNPJ): cada loja tem a sua, **nao sincroniza**.

### Mudancas

#### `src/components/dashboard/PrinterTab.tsx`

1. **Funcoes de impressora (`handlePrinterWidthChange`, `handlePrintModeChange`)**: Trocar o `.eq("id", organization.id)` por `.eq("user_id", organization.user_id)` para que a alteracao se aplique a todas as unidades do proprietario.

2. **Funcao `handleFieldBlur` (comanda)**: Manter como esta, salvando apenas na organizacao atual (`.eq("id", organization.id)`), pois cada loja pode personalizar sua propria comanda.

#### `src/hooks/useAuth.tsx`

Adicionar `cnpj` ao SELECT da query de organizations para que o PrinterTab tenha acesso ao campo.

### Detalhes tecnicos

As alteracoes sao minimas — apenas mudar o filtro do UPDATE nas duas funcoes de configuracao de impressora:

```text
Antes:  .eq("id", organization.id)
Depois: .eq("user_id", organization.user_id)
```

Isso replica automaticamente para todas as lojas do mesmo dono, seguindo o padrao de sincronizacao global ja estabelecido no sistema.

A comanda continua com `.eq("id", organization.id)` para permitir personalizacao individual por unidade.
