

## Plano: Indicador visual de requisitos de senha no cadastro

### O que será feito
Adicionar uma lista de requisitos de senha abaixo do campo "Senha" no formulário de cadastro (`AuthPage.tsx`) e na página de redefinição de senha (`ResetPasswordPage.tsx`). Cada requisito fica cinza por padrão e muda para verde com check quando atendido, em tempo real conforme o usuário digita.

### Requisitos exibidos
- Mínimo 6 caracteres
- Pelo menos 1 letra maiúscula (A-Z)
- Pelo menos 1 número (0-9)
- Pelo menos 1 caractere especial (!@#$%...)

### Arquivos alterados

1. **`src/components/PasswordRequirements.tsx`** (novo) — Componente reutilizável que recebe a senha como prop e renderiza a lista de requisitos com ícones verde/cinza.

2. **`src/pages/AuthPage.tsx`** — Importar e adicionar `<PasswordRequirements>` logo abaixo do campo de senha no formulário de cadastro (após linha 588).

3. **`src/pages/ResetPasswordPage.tsx`** — Adicionar o mesmo componente abaixo do campo "Nova senha".

### Visual
Cada linha terá um pequeno círculo/check à esquerda com o texto do requisito. Cinza quando não atendido, verde quando atendido — transição suave.

