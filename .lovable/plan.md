
Objetivo: corrigir de forma definitiva o caso “clico em Enviar Pedido e cai em `api.whatsapp.com ... ERR_BLOCKED_BY_RESPONSE`”, que ainda está acontecendo.

Diagnóstico confirmado:
- O comportamento atual ainda pode quebrar no seu cenário porque hoje o fallback está assim:
  1) `window.open(url, "_blank")`
  2) se falhar, `window.location.href = url`
  3) só mostra toast manual se o `location.href` lançar erro
- No seu caso, o `location.href` não lança exceção: ele navega e abre a página bloqueada. Resultado: o toast manual não aparece e você fica preso na tela de erro.
- Ou seja, o problema não é “não tentou fallback”; é que o fallback atual está escolhendo uma estratégia (navegar para `api.whatsapp.com`) que também falha no ambiente real de teste.

Do I know what the issue is?
- Sim. O problema está na ordem e no tipo de fallback: o segundo fallback (`location.href`) é agressivo e impede o fallback manual útil.

Plano de implementação (ajuste global e definitivo)

1) Criar um utilitário único para abertura de WhatsApp
- Arquivo novo: `src/lib/whatsappRedirect.ts` (ou nome equivalente do projeto)
- Funções:
  - `isEmbeddedOrRestrictedContext()`: detecta contexto com maior chance de bloqueio (iframe/preview/restrição de navegação)
  - `openWhatsAppWithFallback(url, options)`
- Fluxo interno do util:
  - Tenta `window.open(..., "noopener,noreferrer")`
  - Se não abrir:
    - Em contexto restrito: NÃO usar `location.href`; mostrar toast com ação manual “Abrir”
    - Em contexto normal: opcionalmente tentar `location.href` apenas quando explicitamente permitido
  - O toast manual sempre fica disponível quando `window.open` falha (sem depender de exceção de `location.href`)

2) Corrigir o ponto crítico do checkout (UnitPage) para nunca “sumir” com fallback manual
- Arquivo: `src/pages/UnitPage.tsx`
- Trocar os dois blocos atuais de redirecionamento:
  - `handleSendWhatsApp` (fluxo principal)
  - `handlePixSuccess` (fluxo PIX)
- Em ambos:
  - usar o util central
  - em contexto de pedido, evitar navegação forçada para `location.href` quando ambiente for restrito
  - garantir toast com ação manual “Abrir WhatsApp” como fallback real

3) Padronizar os demais pontos já alterados para remover comportamento inconsistente
- Arquivos:
  - `src/pages/CourierPage.tsx`
  - `src/components/admin/SalesChatTab.tsx`
  - `src/components/dashboard/SettingsTab.tsx`
  - `src/pages/DashboardPage.tsx`
- Todos passam a usar o util central, evitando duplicação de lógica e regressão futura.
- Regra:
  - Fluxos de painel/compartilhamento: sem `location.href`
  - Fluxos operacionais: `location.href` só quando permitido e fora de contexto restrito

4) Melhorar feedback ao usuário no fallback manual
- Mensagem clara:
  - “O navegador bloqueou a abertura automática. Toque em Abrir.”
- Ação do toast:
  - abre o link novamente por gesto explícito do usuário
- (Opcional de robustez no mesmo passo) botão secundário “Copiar link” caso o browser bloqueie múltiplas tentativas.

5) Validação end-to-end (obrigatória) após implementar
- Cenário A: fluxo de pedido completo (`/unidade/...`) com “Enviar Pedido”
- Cenário B: PIX confirmado (`handlePixSuccess`)
- Cenário C: Courier aceita entrega
- Cenário D: abrir WhatsApp no SalesChat
- Cenário E: compartilhamento em Settings e Dashboard
- Verificar em:
  - ambiente atual onde você reportou erro
  - página publicada
  - desktop e mobile
- Critério de aceite:
  - nunca mais ficar preso diretamente na tela bloqueada sem opção de saída
  - sempre existir ação manual funcional no toast quando autoabertura falhar

Seção técnica (resumo objetivo)

```text
Problema real:
  fallback atual depende de exception em location.href
  mas location.href navega para página bloqueada sem exception

Correção:
  centralizar abertura em util único
  priorizar window.open
  em contexto restrito: pular location.href
  exibir fallback manual sempre que open falhar

Arquivos-alvo:
  - src/lib/whatsappRedirect.ts (novo)
  - src/pages/UnitPage.tsx (2 pontos críticos)
  - src/pages/CourierPage.tsx
  - src/components/admin/SalesChatTab.tsx
  - src/components/dashboard/SettingsTab.tsx
  - src/pages/DashboardPage.tsx
```
