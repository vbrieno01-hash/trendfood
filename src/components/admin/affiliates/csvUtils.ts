export type PayoutRow = {
  affiliate_id: string;
  affiliate_name: string;
  pix_key: string | null;
  installments: number;
  total_cents: number;
};

export function buildPixCsv(rows: PayoutRow[], periodLabel: string) {
  const header = "chave_pix;valor;nome_favorecido;descricao";
  const lines = rows.map((r) => {
    const val = (r.total_cents / 100).toFixed(2);
    const pix = (r.pix_key || "").replace(/[;\n]/g, " ");
    const name = r.affiliate_name.replace(/[;\n]/g, " ");
    const desc = `Comissao ${periodLabel} - TrendFood`.replace(/[;\n]/g, " ");
    return `${pix};${val};${name};${desc}`;
  });
  return [header, ...lines].join("\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function nextPayoutDate(now = new Date()): Date {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  // Next 5th: this month if day <= 5, else next month
  if (d <= 5) return new Date(Date.UTC(y, m, 5, 12, 0, 0));
  return new Date(Date.UTC(y, m + 1, 5, 12, 0, 0));
}

export function periodLabel(d: Date) {
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${months[d.getUTCMonth()]}/${d.getUTCFullYear()}`;
}

export const fmtBRL = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";

export const fmtDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("pt-BR") : "—";