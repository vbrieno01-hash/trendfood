
# Correção: Geocoding Falha por Complemento no Endereço

## Causa raiz identificada

Ao testar o fluxo completo, o Nominatim retorna `[]` (sem resultado) para o endereço da loja:

```
"Rua Jaime João Olcese, 51, beco, Vila Couto, Cubatão, SP, Brasil"
```

O problema é o **complemento "beco"** incluído na string enviada ao Nominatim. O geocoder OpenStreetMap não entende complementos livres como "beco", "Apto 3B", etc. — ele espera apenas rua, número, bairro, cidade, estado.

**Prova encontrada nos logs de rede:**
```
GET /search?q=Rua%20Jaime%20Jo%C3%A3o%20Olcese%2C%2051%2C%20beco...
Response Body: []   ← nenhum resultado!
```

## Solução

Duas correções simples e independentes:

### 1. `useDeliveryFee.ts` — remover complemento da string para geocoding

Ao receber o endereço do cliente para geocodificar, o hook não deve incluir o complemento. Como o endereço chegará como string completa, precisamos de uma função auxiliar que remova tokens de complemento (que costumam ser a 3ª parte de um endereço formatado como `"Rua X, Nº, Complemento, Bairro, Cidade, Estado, Brasil"`).

A abordagem mais simples: no hook, antes de geocodificar, montar uma versão "limpa" sem o 3º campo (complemento). Como sabemos o formato exato gerado por `buildCustomerAddress` / `buildStoreAddress`:

```
campo[0]: rua
campo[1]: número
campo[2]: complemento (opcional — pode não existir)
campo[3]: bairro
campo[4]: cidade
campo[5]: estado
campo[6]: "Brasil"
```

Para geocodificar, usar apenas: `rua, número, bairro, cidade, estado, Brasil` — pulando o complemento.

### 2. `UnitPage.tsx` — passar endereço sem complemento para o hook

A string `fullCustomerAddress` passada ao hook deve omitir o complemento. Criar uma função `buildCustomerAddressForGeo` separada do `buildCustomerAddress` (que inclui o complemento para exibição/WhatsApp):

```typescript
// Para geocoding: sem complemento
const buildCustomerAddressForGeo = (f: CustomerAddress) => {
  const parts = [f.street, f.number, f.neighborhood, f.city, f.state, "Brasil"]
    .map((p) => p.trim()).filter(Boolean);
  return parts.join(", ");
};

// Para WhatsApp/notas: com complemento
const buildCustomerAddress = (f: CustomerAddress) => {
  const parts = [f.street, f.number, f.complement, f.neighborhood, f.city, f.state, "Brasil"]
    .map((p) => p.trim()).filter(Boolean);
  return parts.join(", ");
};
```

### 3. `StoreProfileTab.tsx` — o `buildStoreAddress` também inclui complemento

O endereço da loja salvo no banco é: `"Rua Jaime João Olcese, 51, beco, Vila Couto, Cubatão, SP, Brasil"`. O hook de frete usa esse endereço diretamente para geocodificar a loja — e falha pelo mesmo motivo.

Precisamos que o hook de frete extraia apenas os campos relevantes (sem complemento) ao geocodificar o **endereço da loja**. Como o formato é padronizado, podemos criar uma função `stripComplementForGeo` no hook que remove o 3º campo quando o endereço tem 6+ partes separadas por vírgula.

## Arquivos a modificar

| Arquivo | O que muda |
|---|---|
| `src/hooks/useDeliveryFee.ts` | Função `stripComplementForGeo` que limpa o endereço antes de geocodificar; aplicada tanto na loja quanto no cliente |
| `src/pages/UnitPage.tsx` | `fullCustomerAddress` usa versão sem complemento; `buildCustomerAddress` (com complemento) mantido apenas para WhatsApp/notas |

## Detalhe técnico da função de limpeza

```typescript
// Remove o 3º campo (complemento) de endereços com 6+ partes
// Formato: rua, número, [complemento], bairro, cidade, estado, Brasil
function stripComplementForGeo(address: string): string {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  // Endereço com complemento terá 7 partes; sem complemento, 6
  if (parts.length >= 7) {
    // Remover a 3ª parte (índice 2) que é o complemento
    parts.splice(2, 1);
  }
  return parts.join(", ");
}
```

Resultado esperado:
```
Entrada:  "Rua Jaime João Olcese, 51, beco, Vila Couto, Cubatão, SP, Brasil"
Saída:    "Rua Jaime João Olcese, 51, Vila Couto, Cubatão, SP, Brasil"
          → Nominatim encontra ✓
```

## O que o cliente verá depois da correção

```
🛵 Frete (0,3 km)    R$ 5,00   ← calculado automaticamente!
```

(Mesmo endereço, mesma cidade — distância curta → tier 1 → R$ 5,00)
