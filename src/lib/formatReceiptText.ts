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

function center(text: string, _cols: number): string {
  return "##CENTER##" + text;
}

function divider(cols: number): string {
  return "-".repeat(cols);
}

export function formatReceiptText(
  order: PrintableOrder,
  storeName = "Cozinha",
  printerWidth: "58mm" | "80mm" = "58mm"
): string {
  const cols = printerWidth === "58mm" ? 32 : 48;
  const lines: string[] = [];

  // Header
  lines.push(center(storeName.toUpperCase(), cols));
  lines.push(divider(cols));

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
  lines.push(divider(cols));

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

    // Format: qty  name  price (right-aligned)
    const left = `${qty} ${nameStr}`;
    const gap = Math.max(1, cols - left.length - price.length);
    lines.push(left + " ".repeat(gap) + price);
  }

  // Notes
  if (parsed?.raw) {
    lines.push("");
    lines.push(`Obs: ${parsed.raw}`);
  }

  // Total
  const total = items.reduce(
    (sum, item) => sum + (item.price != null ? item.quantity * item.price : 0),
    0
  );

  if (total > 0) {
    lines.push(divider(cols));
    const totalStr = `TOTAL: R$ ${total.toFixed(2).replace(".", ",")}`;
    lines.push("##BOLD##" + " ".repeat(Math.max(0, cols - totalStr.length)) + totalStr);
  }

  // Customer info
  if (parsed && !parsed.raw) {
    lines.push(divider(cols));
    if (parsed.name) lines.push(`Nome: ${parsed.name}`);
    if (parsed.phone) lines.push(`Tel: ${parsed.phone}`);
    if (parsed.address) lines.push(`End.: ${parsed.address}`);
    if (parsed.frete) lines.push(`Frete: ${parsed.frete}`);
    if (parsed.payment) lines.push(`Pgto: ${parsed.payment}`);
    if (parsed.doc) lines.push(`CPF/CNPJ: ${parsed.doc}`);
    if (parsed.obs) lines.push(`Obs: ${parsed.obs}`);
  }

  lines.push(divider(cols));
  lines.push(center("* novo pedido - kds *", cols));

  return lines.join("\n");
}
