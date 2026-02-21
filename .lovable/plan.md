

# Remover bloqueio de entrega para lojas sem endereco

## Situacao atual

- **Rei do Burguer**: endereco configurado corretamente, frete calcula normalmente com os fallbacks de geocodificacao ja implementados. Nenhuma mudanca necessaria aqui.
- **Lojas sem endereco** (Esporte Fino, Loja Matriz, brenotorado): estao com entrega bloqueada (aviso amarelo + toast de erro + botao desabilitado). Isso impede vendas desnecessariamente.

## O que muda

Remover o bloqueio para que lojas sem endereco permitam pedidos de entrega normalmente, com frete aparecendo como "A combinar via WhatsApp".

## Mudancas no arquivo `src/pages/UnitPage.tsx`

### 1. Remover bloqueio na validacao (linhas 268-271)

Tirar o bloco que impede o envio do pedido quando `noStoreAddress` e true:

```text
ANTES:
if (noStoreAddress) {
  toast.error("Esta loja ainda não aceita entregas...");
  valid = false;
}

DEPOIS:
(bloco removido — pedido segue normalmente)
```

### 2. Remover aviso bloqueante na UI (linhas 766-772)

Substituir o bloco amarelo "Entrega indisponivel" por uma linha simples igual ao visual de quando o geocoder falha:

```text
ANTES: bloco amarelo com "Entrega indisponivel — loja sem endereco configurado"

DEPOIS: linha normal mostrando "A combinar via WhatsApp" (mesmo visual da linha 787)
```

### O que continua funcionando

- Loja COM endereco: frete calculado automaticamente (Rei do Burguer OK)
- Loja SEM endereco: frete aparece como "A combinar via WhatsApp", pedido vai pro WhatsApp normalmente
- Alerta no painel do lojista (StoreProfileTab) continua como lembrete para configurar endereco
- Fallback por cidade no geocoder continua melhorando a taxa de acerto
- Nenhuma alteracao no banco de dados

