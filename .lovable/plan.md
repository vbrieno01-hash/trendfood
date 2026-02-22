
# Botao "Testar Impressora" no Dashboard

## O que sera feito

Adicionar um botao **"Testar Impressora"** na secao de Configuracao de Impressao do `SettingsTab.tsx`. Ao clicar, o sistema insere um registro ficticio na tabela `fila_impressao` usando a funcao `enqueuePrint` ja existente, permitindo ao lojista validar que o robo desktop esta funcionando.

## Detalhes da implementacao

### Arquivo: `src/components/dashboard/SettingsTab.tsx`

1. Importar a funcao `enqueuePrint` de `@/lib/printQueue`
2. Adicionar estado `testPrintLoading` para controlar o botao
3. Criar funcao `handleTestPrint` que:
   - Gera um conteudo de teste formatado (data/hora atual, nome da loja, mensagem de teste)
   - Chama `enqueuePrint(organization.id, null, conteudo)` com `order_id` nulo (pois e ficticio)
   - Exibe toast de sucesso ou erro
4. Inserir o botao na secao "Configuracao de Impressao" (onde ja esta o ID da loja e o download do .exe), logo antes do link de download

### Conteudo do pedido de teste

```text
##CENTER## TESTE DE IMPRESSAO
##CENTER## ==================
##CENTER## TrendFood
##CENTER## [data e hora atual]

Tudo certo! Sua impressora
esta configurada corretamente.

##CENTER## ==================
```

### Posicao na UI

O botao ficara na secao "Configuracao de Impressao", entre o aviso amarelo ("Use este ID...") e o botao de download do .exe, seguindo o mesmo estilo visual (`variant="outline"`, `size="sm"`).
