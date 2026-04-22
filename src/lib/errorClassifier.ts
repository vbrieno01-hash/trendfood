export type Severity = "critical" | "warning" | "ignorable";

export interface Classification {
  severity: Severity;
  title: string;
  whatItIs: string;
  impact: string;
  suggestedAction: string;
  patternKey: string;
}

interface Rule {
  key: string;
  match: (msg: string, url: string, stack: string) => boolean;
  severity: Severity;
  title: string;
  whatItIs: string;
  impact: string;
  suggestedAction: string;
}

const RULES: Rule[] = [
  // 🔴 CRÍTICOS — afetam dinheiro / operação
  {
    key: "checkout_payment",
    match: (m, u, s) =>
      /checkout|placeOrder|create-mp-payment|generate-pix|verify-pix/i.test(`${m} ${u} ${s}`),
    severity: "critical",
    title: "Falha no checkout ou pagamento",
    whatItIs: "Erro durante a finalização de pedido ou processamento de pagamento.",
    impact: "Alto — cliente pode não ter conseguido pagar ou finalizar a compra.",
    suggestedAction: "Investigar urgente. Verificar logs do Mercado Pago e tabela orders.",
  },
  {
    key: "printing",
    match: (m, u, s) =>
      /printOrder|fila_impressao|bluetoothPrinter|printQueue/i.test(`${m} ${u} ${s}`),
    severity: "critical",
    title: "Pedido não imprimiu",
    whatItIs: "Falha no envio para impressora térmica (Bluetooth ou fila).",
    impact: "Alto — cozinha pode não ter recebido o pedido.",
    suggestedAction: "Verificar conexão Bluetooth do lojista e fila_impressao no banco.",
  },

  // ⚪ IGNORÁVEIS — ruído conhecido
  {
    key: "old_chunk",
    match: (m) =>
      /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk \d+ failed/i.test(m),
    severity: "ignorable",
    title: "Lojista com versão velha em cache",
    whatItIs: "O navegador tentou carregar uma parte antiga do app que já foi atualizada.",
    impact: "Nenhum — basta o usuário recarregar a página (F5).",
    suggestedAction: "Auto-resolve. Pode ignorar.",
  },
  {
    key: "script_error",
    match: (m) => /^Script error\.?$/i.test(m.trim()),
    severity: "ignorable",
    title: "Erro de script externo (tracker/anúncio)",
    whatItIs: "Erro em script de terceiros (Google Ads, Meta Pixel, extensão do navegador).",
    impact: "Nenhum — não afeta seu app.",
    suggestedAction: "Ignorar. Limitação do CORS de scripts externos.",
  },
  {
    key: "resize_observer",
    match: (m) => /ResizeObserver loop/i.test(m),
    severity: "ignorable",
    title: "Loop de ResizeObserver (cosmético)",
    whatItIs: "Aviso do navegador sobre loop de redimensionamento. Não é bug real.",
    impact: "Nenhum.",
    suggestedAction: "Ignorar. Bug conhecido do Chrome/Safari.",
  },
  {
    key: "notification_construct",
    match: (m) => /Failed to construct 'Notification'/i.test(m),
    severity: "ignorable",
    title: "Permissão de notificação negada",
    whatItIs: "Tentativa de criar notificação sem permissão do usuário.",
    impact: "Nenhum — fluxo já tem fallback.",
    suggestedAction: "Ignorar.",
  },
  {
    key: "dom_remove",
    match: (m) => /removeChild|insertBefore/i.test(m),
    severity: "ignorable",
    title: "Conflito do React com extensão de tradução",
    whatItIs: "Google Tradutor / extensão alterou o DOM enquanto o React renderizava.",
    impact: "Nenhum — usuário recarrega e funciona.",
    suggestedAction: "Ignorar. Bug conhecido com tradutores automáticos.",
  },

  // 🟡 ATENÇÃO — UI travou mas não perdeu dinheiro
  {
    key: "input_target_null",
    match: (m) => /target.*null|null.*target|Cannot read propert.*target/i.test(m),
    severity: "warning",
    title: "Campo de formulário travou no iPhone",
    whatItIs: "Bug conhecido do Safari iOS quando o usuário cola texto rápido em inputs.",
    impact: "Baixo — cliente recarrega e funciona.",
    suggestedAction: "Já tem fix planejado. Pode aguardar.",
  },
  {
    key: "hook_order",
    match: (m) =>
      /Should have a queue|Rendered more hooks|Rendered fewer hooks|Invalid hook call/i.test(m),
    severity: "warning",
    title: "Tela do dashboard travou (hook order)",
    whatItIs: "Componente React renderizou hooks em ordem diferente entre renders.",
    impact: "Médio — lojista vê tela de erro mas o ErrorBoundary recupera.",
    suggestedAction: "Investigar componente afetado. Anote a URL do erro.",
  },
  {
    key: "network_fetch",
    match: (m) => /Failed to fetch|NetworkError|Load failed/i.test(m),
    severity: "warning",
    title: "Falha de conexão de rede",
    whatItIs: "Requisição ao servidor falhou (internet do lojista ou servidor offline).",
    impact: "Variável — depende de qual chamada falhou.",
    suggestedAction: "Verificar se foi pontual ou recorrente.",
  },
  {
    key: "supabase_rls",
    match: (m) => /row.level security|policy|permission denied|RLS/i.test(m),
    severity: "warning",
    title: "Bloqueio de permissão (RLS)",
    whatItIs: "Política de segurança do banco bloqueou uma operação.",
    impact: "Médio — funcionalidade não executou.",
    suggestedAction: "Revisar política RLS da tabela citada no stack.",
  },
];

export function classifyError(
  message: string,
  url: string | null,
  stack: string | null,
): Classification {
  const msg = message ?? "";
  const u = url ?? "";
  const s = stack ?? "";

  for (const rule of RULES) {
    if (rule.match(msg, u, s)) {
      return {
        severity: rule.severity,
        title: rule.title,
        whatItIs: rule.whatItIs,
        impact: rule.impact,
        suggestedAction: rule.suggestedAction,
        patternKey: rule.key,
      };
    }
  }

  return {
    severity: "warning",
    title: "Erro novo — investigar",
    whatItIs: "Padrão ainda não catalogado. Vale olhar o stack abaixo.",
    impact: "Desconhecido até análise.",
    suggestedAction: "Abrir detalhes e analisar. Se for ruído, marque como ignorável.",
    patternKey: "unknown",
  };
}

export const SEVERITY_META: Record<Severity, { label: string; emoji: string; className: string; ringClass: string }> = {
  critical: {
    label: "Crítico",
    emoji: "🔴",
    className: "bg-destructive/15 text-destructive border-destructive/30",
    ringClass: "ring-destructive/40",
  },
  warning: {
    label: "Atenção",
    emoji: "🟡",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    ringClass: "ring-amber-500/40",
  },
  ignorable: {
    label: "Ignorável",
    emoji: "⚪",
    className: "bg-muted text-muted-foreground border-border",
    ringClass: "ring-border",
  },
};