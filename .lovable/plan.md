

## Trocar tab padrão de "Criar conta" para "Entrar"

### Problema
A tela de autenticação abre sempre em "Criar conta", confundindo clientes que já têm conta e querem apenas fazer login.

### Alterações em `src/pages/AuthPage.tsx`

1. **Linha 501** — Mudar `defaultValue="signup"` para `defaultValue="login"`
2. **Linhas 502-514** — Inverter a ordem dos `TabsTrigger`: colocar "Entrar" primeiro (à esquerda) e "Criar conta" segundo (à direita)

Isso garante que ao abrir a página, o formulário de login aparece por padrão e o botão "Entrar" fica na posição de destaque à esquerda.

Zero mudança de lógica, apenas reordenação visual e troca do valor padrão.

