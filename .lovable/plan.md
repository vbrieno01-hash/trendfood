Simplificar `RouteFallback` em `src/App.tsx`:

- Remover totalmente o estágio 1 (anel orbital + "TRENDFOOD inicializando").
- Manter estágio 0 (250ms em branco — evita piscar em load rápido).
- Após 250ms, mostrar direto o card **"Sinal fraco detectado"** com o botão grande **"Reconectar agora"** (já existente, mantido como está).
- Botão fica em destaque desde o início — cliente clica e recarrega.

Arquivo único: `src/App.tsx`. Página `/_preview/fallback` continua funcionando.