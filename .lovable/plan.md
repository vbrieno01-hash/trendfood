

# Corrigir calculo de frete: lojas novas e falhas de geocodificacao

## Problema

O "Rei do Burguer" tem endereco configurado (`11540215, Caminho Santa Marta, 55, Casa, Vila Esperanca, Cubatao, SP, Brasil`), mas o frete nao calculou para algum cliente. Isso acontece por dois motivos possiveis:

1. **Nominatim instavel**: o servico gratuito de geocodificacao tem rate-limiting e pode retornar vazio quando sobrecarregado
2. **Endereco do cliente nao reconhecido**: se o CEP do cliente nao for encontrado no Nominatim, a geocodificacao falha silenciosamente e o frete aparece como "A combinar via WhatsApp" com valor R$0

Alem disso, existem **3 lojas sem endereco configurado** (Esporte Fino, Loja Matriz, brenotorado) que nunca vao calcular frete.

## Solucao em 3 partes

### 1. Alerta no painel do lojista quando falta endereco

**Arquivo: `src/components/dashboard/StoreProfileTab.tsx`**

Adicionar um banner de alerta visivel (amarelo) no topo da secao de endereco quando `store_address` estiver vazio:
- Texto: "Configure o endereco da sua loja para ativar o calculo automatico de frete nas entregas"
- Usar componente `Alert` com icone `AlertTriangle`

### 2. Bloquear entrega no checkout quando loja nao tem endereco

**Arquivo: `src/pages/UnitPage.tsx`**

- Quando `noStoreAddress` for `true` e o cliente selecionar "Entrega":
  - Mostrar aviso claro em amarelo: "Esta loja ainda nao aceita entregas com frete automatico. Escolha Retirada ou entre em contato pelo WhatsApp"
  - Desabilitar o botao de enviar pedido para tipo "Entrega"
- Na funcao `handleSendWhatsApp`: adicionar validacao que bloqueia envio se `orderType === "Entrega" && noStoreAddress`

### 3. Melhorar resiliencia do geocoder com fallback por cidade

**Arquivo: `src/hooks/useDeliveryFee.ts`**

Quando o endereco do cliente falha na geocodificacao completa, adicionar um fallback extra:
- Tentar geocodificar apenas `cidade, estado, Brasil` (garante pelo menos uma estimativa aproximada de distancia)
- Se ate o fallback por cidade falhar, ai sim retornar "A combinar"
- Isso cobre casos onde o CEP do cliente nao e reconhecido no Nominatim, mas a cidade sim

A funcao `geocode` (usada para o endereco do cliente) ganhara um fallback adicional:

```text
Tentativa 1: CEP, Brasil
Tentativa 2: query completa (cep, numero, cidade, estado, Brasil)  
Tentativa 3: query + ", Brasil" (se nao tinha)
Tentativa 4 (NOVA): cidade, estado, Brasil  <-- fallback por cidade
```

## Secao tecnica

### `src/components/dashboard/StoreProfileTab.tsx`
- Importar `Alert, AlertTitle, AlertDescription` de `@/components/ui/alert`
- Importar `AlertTriangle` de `lucide-react`
- Adicionar bloco condicional antes da secao de campos de endereco: se `!storeAddress`, renderizar Alert amarelo

### `src/pages/UnitPage.tsx`
- Linhas 267-275 (validacao de endereco): adicionar check `if (noStoreAddress) { toast error; return; }`
- Linhas 756-786 (secao de frete): quando `noStoreAddress`, mostrar alerta mais visivel em vez da linha discreta atual
- Linhas 795-800 (seletor de tipo): desabilitar ou avisar quando "Entrega" e selecionado com `noStoreAddress`

### `src/hooks/useDeliveryFee.ts`
- Funcao `geocode` (linhas 83-97): adicionar fallback final que extrai cidade e estado da query e tenta geocodificar so eles
- Extrair cidade/estado dos ultimos segmentos da string (antes de "Brasil")

### Nenhuma alteracao no banco de dados
