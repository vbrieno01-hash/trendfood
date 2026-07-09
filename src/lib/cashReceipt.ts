// Gera o texto do Cupom Z (fechamento de caixa) formatado pra impressora térmica 48 colunas.
// Simples, monoespaçado, sem dependências. Idempotente e puro.

const WIDTH = 48;

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const dt = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

// Linha com label à esquerda e valor à direita, preenchida com pontos.
function line(label: string, value: string): string {
  const dots = Math.max(1, WIDTH - label.length - value.length);
  return `${label}${".".repeat(dots)}${value}`;
}

function center(text: string): string {
  const pad = Math.max(0, Math.floor((WIDTH - text.length) / 2));
  return `${" ".repeat(pad)}${text}`;
}

function divider(char = "-"): string {
  return char.repeat(WIDTH);
}

export interface CashReceiptData {
  storeName: string;
  openedAt: string;
  closedAt: string;
  openedByName: string;
  closedByName: string;
  openingBalance: number;
  revenueByMethod: { dinheiro: number; pix: number; cartao: number; outros: number };
  totalSuprimentos: number;
  totalSangrias: number;
  expected: number;
  counted: number;
  divergence: number;
  divergenceReason?: string | null;
  movements: Array<{
    time: string;
    type: "sangria" | "suprimento";
    category: string | null;
    reason: string | null;
    amount: number;
  }>;
  orderCount: number;
}

export function buildCashReceipt(d: CashReceiptData): string {
  const lines: string[] = [];

  lines.push(center("=== CUPOM Z / FECHAMENTO DE CAIXA ==="));
  lines.push(center(d.storeName));
  lines.push(divider("="));
  lines.push(`Abertura : ${dt(d.openedAt)}  (${d.openedByName})`);
  lines.push(`Fechamto : ${dt(d.closedAt)}  (${d.closedByName})`);
  lines.push(`Pedidos no turno: ${d.orderCount}`);
  lines.push(divider());

  lines.push(center("RECEITA POR FORMA DE PAGAMENTO"));
  lines.push(line("Dinheiro", fmt(d.revenueByMethod.dinheiro)));
  lines.push(line("PIX", fmt(d.revenueByMethod.pix)));
  lines.push(line("Cartao", fmt(d.revenueByMethod.cartao)));
  lines.push(line("Outros", fmt(d.revenueByMethod.outros)));
  const totalRev =
    d.revenueByMethod.dinheiro + d.revenueByMethod.pix + d.revenueByMethod.cartao + d.revenueByMethod.outros;
  lines.push(line("TOTAL RECEITA", fmt(totalRev)));
  lines.push(divider());

  lines.push(center("DINHEIRO EM CAIXA"));
  lines.push(line("Saldo inicial", fmt(d.openingBalance)));
  lines.push(line("(+) Receita dinheiro", fmt(d.revenueByMethod.dinheiro)));
  lines.push(line("(+) Suprimentos", fmt(d.totalSuprimentos)));
  lines.push(line("(-) Sangrias", fmt(d.totalSangrias)));
  lines.push(line("= ESPERADO", fmt(d.expected)));
  lines.push(line("= CONTADO", fmt(d.counted)));
  const divLabel = d.divergence === 0 ? "= DIVERGENCIA" : d.divergence > 0 ? "= SOBRA" : "= FALTA";
  lines.push(line(divLabel, fmt(Math.abs(d.divergence))));
  if (d.divergenceReason) {
    lines.push("");
    lines.push("Justificativa:");
    lines.push(d.divergenceReason);
  }
  lines.push(divider());

  if (d.movements.length > 0) {
    lines.push(center("MOVIMENTACOES"));
    for (const m of d.movements) {
      const sign = m.type === "suprimento" ? "+" : "-";
      const cat = m.category ? m.category.toUpperCase() : "—";
      lines.push(`${m.time}  ${sign}${fmt(m.amount)}  [${cat}]`);
      if (m.reason) lines.push(`  ${m.reason}`);
    }
    lines.push(divider());
  }

  lines.push(center("Guarde este cupom"));
  lines.push("");
  lines.push("");
  lines.push("");

  return lines.join("\n");
}