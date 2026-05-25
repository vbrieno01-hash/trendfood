Objetivo: fazer o modo manual do admin voltar a testar e conectar corretamente em ambiente de testes, sem reintroduzir o fluxo automático por QR.

Plano

1. Corrigir o teste de status no admin
- Ajustar o botão “Testar /status” para usar o método aceito pelo servidor de teste.
- Manter a leitura do retorno compatível com os formatos já tratados hoje.
- Exibir mensagem de erro mais útil quando o servidor responder 405/404/401.

2. Alinhar o sandbox com o padrão já usado no backend
- Reutilizar o mesmo padrão de consulta de status que o projeto já usa no backend para uazapi.
- Garantir que a URL manual salva na loja de teste continue sendo respeitada.

3. Revisar a UX mínima do modo manual
- Ajustar o texto da tela para não sugerir “cria e apaga em 1 clique”, já que agora é só modo manual.
- Manter apenas o necessário: URL, token, nome, salvar, testar status e webhook.

4. Validar o fluxo no preview
- Confirmar que o clique em “Testar /status” deixa de retornar 405.
- Verificar que o resultado exibido mostra status/telefone quando o servidor devolver esses dados.

Detalhes técnicos
- Hoje o 405 vem de `POST https://free.uazapi.com/instance/status`.
- No projeto, a função `uazapi-instance-status` já consulta esse mesmo endpoint com `GET`.
- A correção principal é alinhar `src/components/admin/AIBotAdminTab.tsx` com esse comportamento existente, sem mexer no fluxo automático antigo.