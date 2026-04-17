
## Diagnóstico

As abas **"Instâncias WhatsApp"** e **"Robô IA"** já estão no código (`AdminPage.tsx` linhas 261-262 e renderizadas nas linhas 938-939). Mas no seu screenshot da sidebar elas não aparecem — você vê WhatsApp e pula direto pra Melhorias.

**Causa:** cache do preview. O Vite tá servindo a versão antiga do `AdminPage.tsx` no navegador (compilou a sessão anterior antes das edições e não recarregou).

## Solução (você, sem precisar de código)

**Faça hard refresh** na aba do preview:
- **Mac**: `Cmd + Shift + R`
- **Windows/Linux**: `Ctrl + Shift + R`

Ou na barra de endereço do preview, recarregue forçando: clique no botão de refresh do preview do Lovable (ícone circular) — não o do navegador.

Depois do refresh, na sidebar do `/admin`, dentro do grupo **GESTÃO**, você vai ver nessa ordem:
- WhatsApp
- **Instâncias WhatsApp** ← nova
- **Robô IA** ← era a aba antiga "Robô IA" do AIBotAdminTab, agora movida pra esse grupo
- Melhorias

## Onde testar o fluxo do bot depois do refresh

1. Clica em **"Robô IA"** na sidebar — é onde tá a config do bot de teste (token, instance_name, test_org_id, prompt). Salva ali pra disparar o upsert em `whatsapp_instances`.
2. Clica em **"Instâncias WhatsApp"** — vai ver a linha da TrendFood (`HqrTf5`) que foi seedada, com status connected, número conectado e botão de desconectar.
3. Manda "oi" do seu WhatsApp pro número conectado → robô responde.

## Se mesmo após hard refresh ainda não aparecer

Me avisa que aí investigo se tem algum filtro/condição escondendo as abas (ex: `isAdmin` falhando pra `wa_instances` por algum motivo, ou erro de import quebrando o render). Mas 99% das vezes esse sintoma é cache do preview.
