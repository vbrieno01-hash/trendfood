

## O que acontece hoje

- `/dashboard?tab=aibot` carrega `AIBotTab.tsx` que é **100% estático "EM BREVE"** pra todos os lojistas (decisão sua na questão 1c).
- A TrendFood já tem instância conectada no servidor (`HqrTf5`) e o roteamento backend funciona — você consegue receber resposta do bot mandando msg pro WhatsApp dela. Mas o painel do lojista não mostra nada disso.

## O plano: liberar a aba real só pra TrendFood (allowlist)

Bypass do "EM BREVE" baseado em `organization_id`. Quando o lojista abrir a aba e o `org.id` estiver na lista de teste, mostra o painel de verdade. Senão, continua "EM BREVE".

### O que construir

**1. AIBotTab refatorado com 2 modos**
- Lê `organization.id` do `useAuth`
- Compara contra constante `BETA_ORG_IDS = ["c9d9db45-3e46-4b03-8a2e-7af4557c6a3e"]` (TrendFood)
- Se não estiver na lista → renderiza o "EM BREVE" atual (mantém igual)
- Se estiver → renderiza o **painel real**:

**Painel real (modo conectado, já que TrendFood já tá conectada):**
- Card verde "WhatsApp conectado" mostrando `+5516988083263` e nome `TrendFood`
- Botão "Atualizar status" (chama `uazapi-instance-status`)
- Botão "Desconectar" (chama `uazapi-disconnect` com `delete_instance: false`)
- Configurações editáveis: mensagem de boas-vindas + prompt do bot + modelo IA (lê/grava em `ai_bot_config` singleton)
- Toggle "Bot ativo" (liga/desliga o `enabled` em `ai_bot_config`)
- Histórico recente: últimas 10 linhas da `fila_whatsapp` mostrando "cliente → resposta" pra você ver o bot funcionando ao vivo

**Painel real (modo desconectado, caso desconecte):**
- Botão "Conectar WhatsApp" → chama `uazapi-create-instance` → mostra QR Code → polling no `uazapi-instance-status` até connected

**2. Quando expandir pros lojistas comuns (futuro)**
Trocar o allowlist por uma flag global (`platform_config.ai_bot_public = true`) ou por plano (`subscription_plan IN ('pro','enterprise')`). Mas isso é depois — agora só TrendFood.

### Arquivo a editar
- `src/components/dashboard/AIBotTab.tsx` — adicionar allowlist + render condicional + painel real

### Resultado esperado
Você abre `/dashboard?tab=aibot` logado como dono da TrendFood → vê o painel real conectado → consegue editar prompt/mensagem, ver histórico de conversas, desconectar e reconectar. Outros lojistas continuam vendo "EM BREVE".

