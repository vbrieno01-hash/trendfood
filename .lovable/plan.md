

# Corrigir PWA do Motoboy Perdendo o Slug da Organizacao

## Problema
Quando o motoboy instala o PWA e abre o app, ele ve a tela "Acesse com o link fornecido pela loja" porque:
1. O `start_url` do manifest e `/motoboy` sem o parametro `?org=SLUG`
2. O `getSavedOrgSlug()` pode nao encontrar o slug no localStorage

## Solucao
Duas mudanças:

### 1. Gerar o manifest dinamicamente com o slug salvo
Em vez de usar um manifest estatico, o `CourierPage` vai atualizar o `start_url` do manifest para incluir o `?org=SLUG` quando o slug estiver disponivel. Isso garante que ao instalar o PWA, o `start_url` ja tera o slug correto.

### 2. Tela de fallback com campo para digitar o slug
Quando nao ha slug (nem na URL, nem no localStorage), em vez de apenas mostrar uma mensagem generica, mostrar um campo onde o motoboy pode digitar o slug da loja ou colar o link completo. Isso permite recuperar o acesso sem precisar pedir o link de novo.

## Alteracoes

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/CourierPage.tsx` | 1. No useEffect do manifest, setar `start_url` para `/motoboy?org=${orgSlug}` quando o slug estiver disponivel. 2. Na tela de "sem slug", adicionar um Input para o motoboy digitar/colar o slug e um botao para acessar. |

## Detalhes tecnicos

### Manifest dinamico (dentro do useEffect existente)
Quando o slug esta disponivel, criar um blob URL com o manifest atualizado contendo `start_url: /motoboy?org=SLUG` e aplicar como href do link manifest. Isso garante que a instalacao do PWA salve a URL correta.

### Tela de fallback
Substituir a mensagem estatica por um formulario simples:
- Input com placeholder "Ex: minha-loja"
- Botao "Acessar"
- Ao submeter, redireciona para `/motoboy?org=VALOR_DIGITADO`
- Texto explicativo: "Digite o identificador da loja ou cole o link completo"

