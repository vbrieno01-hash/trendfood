import type { PrintableOrder } from "./printOrder";

interface ParsedNotes {
  tipo?: string;
  name?: string;
  phone?: string;
  address?: string;
  frete?: string;
  payment?: string;
  doc?: string;
  obs?: string;
  raw?: string;
}

function parseNotes(notes: string): ParsedNotes {
  if (!notes.includes("|")) return { raw: notes };
  const parts = Object.fromEntries(
    notes.split("|").map((part) => {
      const idx = part.indexOf(":");
      return [part.slice(0, idx), part.slice(idx + 1)];
    })
  );
  return {
    tipo: parts["TIPO"] || undefined,
    name: parts["CLIENTE"] || undefined,
    phone: parts["TEL"] || undefined,
    address: parts["END."] || undefined,
    frete: parts["FRETE"] || undefined,
    payment: parts["PGTO"] || undefined,
    doc: parts["DOC"] || undefined,
    obs: parts["OBS"] || undefined,
  };
}

const MAX_COLS = 32;

function center(text: string, _cols: number): string {
  return "##CENTER##" + text;
}

function divider(): string {
  return "-".repeat(MAX_COLS);
}

/** Wrap a string into multiple lines of at most maxCols visible characters, breaking at spaces when possible. */
function wrapLine(text: string, maxCols: number = MAX_COLS): string[] {
  if (text.length <= maxCols) return [text];
  const result: string[] = [];
  let remaining = text;
  while (remaining.length > maxCols) {
    let breakAt = remaining.lastIndexOf(" ", maxCols);
    if (breakAt <= 0) breakAt = maxCols; // no space found, hard break
    result.push(remaining.slice(0, breakAt));
    remaining = remaining.slice(breakAt).trimStart();
  }
  if (remaining.length > 0) result.push(remaining);
  return result;
}

export function formatReceiptText(
  order: PrintableOrder,
  storeName = "Cozinha",
  _printerWidth: "58mm" | "80mm" = "58mm"
): string {
  const cols = MAX_COLS;
  const lines: string[] = [];

  // Header
  lines.push(center(storeName.toUpperCase(), cols));
  lines.push(divider());

  // Location
  const parsed = order.notes ? parseNotes(order.notes) : null;
  const locationLabel =
    order.table_number === 0
      ? parsed?.tipo === "Retirada"
        ? "RETIRADA"
        : "ENTREGA"
      : `MESA ${order.table_number}`;

  const date = new Date(order.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
  const time = new Date(order.created_at).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  lines.push(`##BOLD##${locationLabel}  ${date} ${time}`);
  lines.push(divider());

  // Items
  const items = order.order_items ?? [];
  for (const item of items) {
    const qty = `${item.quantity}x`;
    const price =
      item.price != null
        ? `R$ ${(item.quantity * item.price).toFixed(2).replace(".", ",")}`
        : "";
    const nameStr = item.customer_name
      ? `${item.name} - ${item.customer_name}`
      : item.name;

    const left = `${qty} ${nameStr}`;
    if (price === "") {
      // No price — just wrap the name
      lines.push(...wrapLine(left, cols));
    } else {
      const fullLine = left + " " + price;
      if (fullLine.length <= cols) {
        // Fits in one line — right-align price
        const gap = cols - left.length - price.length;
        lines.push(left + " ".repeat(Math.max(1, gap)) + price);
      } else {
        // Split: name on first line(s), price right-aligned on next
        lines.push(...wrapLine(left, cols));
        lines.push(" ".repeat(cols - price.length) + price);
      }
    }
  }

  // Notes
  if (parsed?.raw) {
    lines.push("");
    lines.push(...wrapLine(`Obs: ${parsed.raw}`, cols));
  }

  // Total
  const total = items.reduce(
    (sum, item) => sum + (item.price != null ? item.quantity * item.price : 0),
    0
  );

  if (total > 0) {
    lines.push(divider());
    const totalStr = `TOTAL: R$ ${total.toFixed(2).replace(".", ",")}`;
    lines.push("##BOLD##" + " ".repeat(Math.max(0, cols - totalStr.length)) + totalStr);
  }

  // Customer info
  if (parsed && !parsed.raw) {
    lines.push(divider());
    const fields: [string, string | undefined][] = [
      ["Nome: ", parsed.name],
      ["Tel: ", parsed.phone],
      ["End.: ", parsed.address],
      ["Frete: ", parsed.frete],
      ["Pgto: ", parsed.payment],
      ["CPF/CNPJ: ", parsed.doc],
      ["Obs: ", parsed.obs],
    ];
    for (const [label, value] of fields) {
      if (value) {
        lines.push(...wrapLine(`${label}${value}`, cols));
      }
    }
  }

  lines.push(divider());
  lines.push(center("* novo pedido - kds *", cols));

  return lines.join("\n");
}
