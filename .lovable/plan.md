
# Adicionar tela de Login para Motoboys

## Problema
Quando o motoboy limpa o cache do celular, troca de aparelho ou aperta "Sair", ele perde o acesso. A unica forma de entrar novamente e preencher o formulario de cadastro completo de novo. Falta um botao "Ja tenho cadastro" com login simplificado.

## Solucao
Adicionar uma opcao de login por telefone na tela de cadastro do motoboy. O fluxo fica assim:

- Tela padrao: formulario de cadastro (como ja esta)
- Novo link abaixo do botao "Cadastrar": "Ja tenho cadastro? Entrar"
- Ao clicar, troca para um formulario simples com apenas **Telefone** 
- O sistema busca o motoboy pelo telefone + organizacao
- Se encontrar, salva o ID no localStorage e entra
- Se nao encontrar, mostra erro "Nenhum cadastro encontrado com esse telefone"
- Link para voltar ao cadastro: "Nao tem cadastro? Cadastrar"

## Alteracoes

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/CourierPage.tsx` | Adicionar estado `isLogin` para alternar entre cadastro e login. Criar formulario de login por telefone. Adicionar links para alternar entre os dois modos. |
| `src/hooks/useCourier.ts` | Criar hook `useLoginCourier` que busca motoboy por telefone + org_id e salva o ID no localStorage. |

## Detalhes tecnicos

### Hook `useLoginCourier` (em `useCourier.ts`)
```typescript
export function useLoginCourier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { organization_id: string; phone: string }) => {
      const { data, error } = await supabase
        .from("couriers")
        .select("*")
        .eq("organization_id", input.organization_id)
        .eq("phone", input.phone)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("NOT_FOUND");
      const courier = data as unknown as Courier;
      saveCourierId(courier.id);
      return courier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier"] });
    },
  });
}
```

### Tela de login (em `CourierPage.tsx`)
- Novo estado: `const [isLogin, setIsLogin] = useState(false)`
- Quando `isLogin === true`, mostra formulario simples com campo de telefone e botao "Entrar"
- Links para alternar entre modos na parte inferior do formulario
