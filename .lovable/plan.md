

# Melhorar tela inicial do motoboy - Login por telefone

## Problema atual
Quando o motoboy acessa `/motoboy` sem o parametro `?org=` na URL e sem dados salvos no celular, ele ve uma tela pedindo o "identificador da loja" (slug). Motoboys nao sabem o que e isso e ficam travados.

## Solucao
Transformar a tela de fallback (sem slug) em uma tela de login por telefone. O motoboy digita apenas o telefone e o sistema busca o cadastro dele em todas as organizacoes automaticamente. Se encontrar, faz login e redireciona. Se nao encontrar, ai sim mostra a opcao de digitar o identificador da loja (para novos cadastros).

## Fluxo novo

```text
Motoboy abre /motoboy (sem ?org=)
          |
     Tem courier_id no localStorage?
     /                \
   Sim                Nao
    |                  |
  Auto-recover     Tela: "Entre com seu telefone"
  (ja funciona)        |
                   Busca telefone em todas as orgs
                   /                \
                Achou             Nao achou
                  |                  |
           Salva courier_id     Mostra: "Nenhum cadastro encontrado.
           + org slug            Peca o link da loja ao seu gerente."
           Redireciona           + campo manual de slug (como fallback)
```

## Alteracao tecnica

### Arquivo: `src/pages/CourierPage.tsx`

Substituir o bloco de fallback (linhas 242-278) que mostra o input de slug por uma nova tela com:

1. **Campo de telefone** como entrada principal com botao "Entrar"
2. **Busca global**: ao submeter, faz query em `couriers` filtrando por `phone` (normalizado) e `active = true`, sem filtrar por `organization_id`
3. **Se encontrar**: salva o `courier_id` no localStorage, busca o slug da organizacao, salva e redireciona para `/motoboy?org=SLUG`
4. **Se nao encontrar**: exibe mensagem amigavel "Nenhum cadastro encontrado com esse telefone" e mostra um link/botao secundario "Tenho o link da loja" que expande o campo de slug manual (mantendo o fallback atual como opcao secundaria)

### Detalhes da busca global por telefone

```text
SELECT * FROM couriers WHERE active = true
-> filtrar no client-side pelo phone normalizado (remover nao-digitos)
-> pegar o primeiro resultado
-> buscar organizations.slug pelo organization_id do courier encontrado
```

Isso reutiliza a mesma logica de normalizacao de telefone que ja existe no hook `useLoginCourier`, mas sem precisar de `organization_id`.

### Layout da nova tela

- Icone de moto (Bike) no topo
- Titulo: "Painel do Motoboy"
- Subtitulo: "Entre com seu telefone cadastrado"
- Input de telefone
- Botao "Entrar"
- Se erro: mensagem + link "Tenho o link da loja" que mostra o campo de slug
- Botao "Nao tenho cadastro? Peca o link ao seu gerente"

### Resumo de arquivos

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/CourierPage.tsx` | Substituir bloco de fallback (sem slug) por tela de login por telefone com busca global |

Nenhuma migracao ou tabela nova necessaria.
