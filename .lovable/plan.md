

## Plano — Esconder o badge "Edit with Lovable" via configuração

O badge não vem do código do projeto, então não há arquivo pra editar. Ele é injetado pela Lovable nos sites publicados e é controlado por uma configuração de projeto.

### O que vou fazer

Chamar a ferramenta `publish_settings--set_badge_visibility` com `hide_badge: true`. Isso desliga o badge no site publicado (`https://trendfood.lovable.app`) sem alterar nenhum arquivo do código.

### Pré-requisitos

- Plano **Pro ou superior** na sua conta Lovable (esconder o badge é recurso pago; mostrar funciona em qualquer plano).
- Se a conta não estiver no plano Pro, a chamada vai falhar e eu te aviso pra você fazer upgrade primeiro.

### Como vai funcionar

1. Aplico `hide_badge: true` na configuração do projeto.
2. Confirmo via `get_badge_visibility` que ficou desligado.
3. Publico/republico se necessário pro deploy refletir a mudança.

### Reversível

Se um dia quiser voltar a mostrar o badge, é só pedir e eu rodo `set_badge_visibility` com `hide_badge: false`.

### O que NÃO vou fazer

- Não vou mexer em `index.html`, `App.tsx` nem em nenhum arquivo do projeto.
- Não vou tentar bloquear o badge via CSS/JS (isso viola os termos da Lovable e pode quebrar o deploy).

