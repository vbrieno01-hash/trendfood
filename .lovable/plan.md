
# Adicionar campos de endereço da loja no cadastro inicial

## Objetivo

Quando o novo usuário criar sua conta, já preenche o endereço completo da loja (CEP, número, complemento) diretamente no formulário de cadastro — sem precisar ir até o painel de configurações depois. Os dados são salvos automaticamente no campo `store_address` da tabela `organizations` no mesmo momento em que a conta é criada.

## O que muda visualmente

O bloco "Dados do Estabelecimento" no formulário de cadastro passa a ter uma seção extra abaixo do nome/slug, com os campos de endereço — igual ao que já existe no painel:

```
DADOS DO ESTABELECIMENTO
├── Nome da lanchonete
├── URL pública (/u/...)
│
└── Endereço da loja (novo bloco)
    ├── CEP  [campo + botão Buscar]  ← preenche rua/bairro/cidade/estado via ViaCEP
    ├── Rua              (preenchida automaticamente, editável)
    ├── Número  |  Complemento
    ├── Bairro           (preenchida automaticamente, editável)
    └── Cidade | Estado  (preenchida automaticamente, editável)
```

Os campos são **opcionais** no cadastro (o usuário pode pular e preencher depois no dashboard), exceto pelo CEP que — se preenchido — deve ser válido antes de prosseguir.

## Arquivo a modificar: `src/pages/AuthPage.tsx`

### 1. Novo estado `addressFields`

```typescript
const [addressFields, setAddressFields] = useState({
  cep: "", street: "", number: "", complement: "",
  neighborhood: "", city: "", state: "",
});
const [cepFetching, setCepFetching] = useState(false);
```

### 2. Função `fetchCep` (igual à do StoreProfileTab)

Ao digitar 8 dígitos no campo CEP e clicar "Buscar" (ou ao onBlur), chama a ViaCEP e preenche rua/bairro/cidade/estado automaticamente.

### 3. Função `buildStoreAddress` (importada ou copiada localmente)

Monta a string estruturada `"CEP, Rua, Número, Complemento, Bairro, Cidade, Estado, Brasil"` — o mesmo formato que o `useDeliveryFee` já sabe geocodificar.

### 4. `handleSignup` — salva `store_address`

No insert da organização, adicionar:
```typescript
store_address: buildStoreAddress(addressFields) || null,
whatsapp: signupData.whatsapp || null,
```

### 5. Novos campos no JSX (dentro do bloco "Dados do estabelecimento")

Adicionar após o campo de URL pública:

- Separador visual com label "Endereço"
- Campo CEP com botão "Buscar" (spinner durante fetch) — `inputMode="numeric"` com máscara
- Campo Rua (readonly se veio do ViaCEP, mas editável)
- Linha com Número + Complemento lado a lado
- Campo Bairro (readonly se veio do ViaCEP)
- Linha com Cidade + Estado lado a lado
- Campo WhatsApp (opcional) — aproveitar o cadastro para já coletar

## Comportamento do scroll

O formulário de cadastro ficará mais longo. O painel direito já tem `overflow-y-auto` implícito pela estrutura da página, então o scroll funciona naturalmente. O botão "Criar minha conta grátis" permanece ancorado no fim do form.

## Compatibilidade

- Nenhuma alteração no banco necessária — `store_address` e `whatsapp` já existem na tabela `organizations` e aceitam `null`.
- O `buildStoreAddress` produz o mesmo formato que o `StoreProfileTab` já grava e o `useDeliveryFee` já sabe ler.
- Se o usuário deixar o endereço em branco, `store_address = null` — comportamento atual mantido.
