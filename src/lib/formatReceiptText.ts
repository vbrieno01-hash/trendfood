import type { PrintableOrder } from "./printOrder";

interface ParsedNotes {
  tipo?: string;
  name?: string;
  phone?: string;
  address?: string;
  frete?: string;
  payment?: string;
  troco?: string;
  doc?: string;
  obs?: string;
  raw?: string;
}

export function parseNotes(notes: string): ParsedNotes {
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
    troco: parts["TROCO"] || undefined,
    doc: parts["DOC"] || undefined,
    obs: parts["OBS"] || undefined,
  };
}

function stripDiacritics(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const MAX_COLS = 32;

function center(text: string): string {
  return "##CENTER##" + text;
}

function bold(text: string): string {
  return "##BOLD##" + text;
}

function divider(): string {
  return "-".repeat(MAX_COLS);
}

/** Wrap a string into multiple lines of at most maxCols visible characters. */
function wrapLine(text: string, maxCols: number = MAX_COLS): string[] {
  if (text.length <= maxCols) return [text];
  const result: string[] = [];
  let remaining = text;
  while (remaining.length > maxCols) {
    let breakAt = remaining.lastIndexOf(" ", maxCols);
    if (breakAt <= 0) breakAt = maxCols;
    result.push(remaining.slice(0, breakAt));
    remaining = remaining.slice(breakAt).trimStart();
  }
  if (remaining.length > 0) result.push(remaining);
  return result;
}

function rightAlign(text: string, cols: number = MAX_COLS): string {
  return " ".repeat(Math.max(0, cols - text.length)) + text;
}

/** Parse item name to separate base name, addons, and per-item obs */
function parseItemName(name: string): { baseName: string; addons: string[]; itemObs?: string } {
  let baseName = name;
  let itemObs: string | undefined;
  const addons: string[] = [];

  // Extract per-item obs: " | Obs: ..."
  const obsMatch = baseName.match(/\s*\|\s*Obs:\s*(.+)$/i);
  if (obsMatch) {
    itemObs = obsMatch[1].trim();
    baseName = baseName.slice(0, obsMatch.index).trim();
  }

  // Extract addons in parentheses: "(+ Bacon, + Cheddar)"
  const addonMatch = baseName.match(/\s*\(([^)]+)\)\s*$/);
  if (addonMatch) {
    baseName = baseName.slice(0, addonMatch.index).trim();
    addonMatch[1].split(",").forEach((a) => {
      const cleaned = a.trim().replace(/^\+\s*/, "").trim();
      if (cleaned) addons.push(cleaned);
    });
  }

  return { baseName, addons, itemObs };
}

export interface StoreInfo {
  name: string;
  address?: string;
  contact?: string;
  cnpj?: string;
}

export function formatReceiptText(
  order: PrintableOrder,
  storeInfo: StoreInfo | string = "Cozinha",
  _printerWidth: "58mm" | "80mm" = "58mm"
): string {
  const cols = MAX_COLS;
  const lines: string[] = [];
  const info: StoreInfo = typeof storeInfo === "string" ? { name: storeInfo } : storeInfo;
  const parsed = order.notes ? parseNotes(order.notes) : null;

  // ── HEADER ──────────────────────────────────────────
  const locationLabel =
    order.table_number === 0
      ? parsed?.tipo === "Retirada"
        ? "RETIRADA"
        : "PARA ENTREGA"
      : `MESA ${order.table_number}`;

  lines.push(center(bold(locationLabel)));
  lines.push("");

  // Date & time
  const dt = new Date(order.created_at);
  const date = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  lines.push(center(`${date} ${time}`));

  // Estimated delivery (30-40 min)
  if (parsed?.tipo !== "Retirada" && order.table_number === 0) {
    const eta1 = new Date(dt.getTime() + 30 * 60000);
    const eta2 = new Date(dt.getTime() + 40 * 60000);
    const fmt = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    lines.push(center(`Previsao: ${fmt(eta1)} - ${fmt(eta2)}`));
  }

  lines.push("");
  lines.push(center(bold(info.name.toUpperCase())));
  if (info.address) lines.push(center(info.address));
  if (info.contact) lines.push(center(info.contact));
  if (info.cnpj) lines.push(center(`CNPJ: ${info.cnpj}`));

  // Order number (big)
  if (order.order_number) {
    lines.push("");
    lines.push(center(bold(`PEDIDO #${order.order_number}`)));
  }

  // ── ITEMS ───────────────────────────────────────────
  lines.push(divider());
  const items = order.order_items ?? [];
  items.forEach((item, idx) => {
    const { baseName, addons, itemObs } = parseItemName(item.name);
    const price =
      item.price != null
        ? `R$ ${(item.quantity * item.price).toFixed(2).replace(".", ",")}`
        : "";

    const num = `${idx + 1})`;
    const nameWithCustomer = item.customer_name
      ? `${baseName} - ${item.customer_name}`
      : baseName;
    const left = `${num} ${nameWithCustomer}`;

    if (price === "") {
      lines.push(...wrapLine(left, cols));
    } else {
      // Try to fit "1) Item Name ..... R$ 10,00" with dots
      const minDots = 3;
      const available = cols - left.length - price.length;
      if (available >= minDots) {
        const dots = ".".repeat(available);
        lines.push(left + dots + price);
      } else if (left.length + 1 + price.length <= cols) {
        const gap = cols - left.length - price.length;
        lines.push(left + " ".repeat(Math.max(1, gap)) + price);
      } else {
        lines.push(...wrapLine(left, cols));
        lines.push(rightAlign(price, cols));
      }
    }

    // Addons with indent
    for (const addon of addons) {
      lines.push(`   - ${addon}`);
    }
    // Per-item observations with indent
    if (itemObs) {
      lines.push(...wrapLine(`   Obs: ${itemObs}`, cols));
    }
  });

  // General observations
  if (parsed?.obs) {
    lines.push("");
    lines.push(...wrapLine(`Obs: ${parsed.obs}`, cols));
  }
  if (parsed?.raw) {
    lines.push("");
    lines.push(...wrapLine(`Obs: ${parsed.raw}`, cols));
  }

  // ── CUSTOMER & DELIVERY ─────────────────────────────
  if (parsed && !parsed.raw) {
    lines.push(divider());
    if (parsed.name) lines.push(...wrapLine(`Nome: ${parsed.name}`, cols));
    if (parsed.phone) lines.push(...wrapLine(`Tel: ${parsed.phone}`, cols));
    if (parsed.doc) lines.push(...wrapLine(`CPF/CNPJ: ${parsed.doc}`, cols));

    if (parsed.address) {
      lines.push(...wrapLine(`End.: ${parsed.address}`, cols));

      // Extract neighborhood/city from address for emphasis
      const addrParts = parsed.address.split(",").map((p) => p.trim());
      // Typical: Rua X, 123, Compl, Bairro, Cidade, UF, CEP, Brasil
      if (addrParts.length >= 5) {
        const bairro = addrParts[3] || "";
        const cidade = addrParts[4] || "";
        if (bairro || cidade) {
          lines.push(`Bairro: ${bairro}${cidade ? ` - ${cidade}` : ""}`);
        }
      }
    }
  }

  // ── PAYMENT & TOTALS ────────────────────────────────
  lines.push(divider());

  if (parsed?.payment) {
    lines.push(center(`Pgto: ${parsed.payment}`));
    lines.push(center(bold("* Cobrar do cliente *")));
    lines.push("");
  }

  const subtotal = items.reduce(
    (sum, item) => sum + (item.price != null ? item.quantity * item.price : 0),
    0
  );

  let deliveryFeeValue = 0;
  if (parsed?.frete) {
    const freteCleaned = parsed.frete.replace(/[^\d,\.]/g, "").replace(",", ".");
    const parsedFee = parseFloat(freteCleaned);
    if (!isNaN(parsedFee)) deliveryFeeValue = parsedFee;
  }

  const grandTotal = subtotal + deliveryFeeValue;

  if (subtotal > 0) {
    if (deliveryFeeValue > 0 || parsed?.frete) {
      lines.push(rightAlign(`Subtotal: R$ ${subtotal.toFixed(2).replace(".", ",")}`, cols));
      const freteLabel = parsed?.frete?.toLowerCase() === "gratis" || parsed?.frete?.toLowerCase() === "grátis"
        ? "Gratis"
        : deliveryFeeValue > 0
          ? `R$ ${deliveryFeeValue.toFixed(2).replace(".", ",")}`
          : parsed?.frete || "A combinar";
      lines.push(rightAlign(`Tx Entrega: ${freteLabel}`, cols));
    }
    lines.push(bold(rightAlign(`TOTAL: R$ ${grandTotal.toFixed(2).replace(".", ",")}`, cols)));
  }

  if (parsed?.troco) {
    lines.push(rightAlign(`Troco para: ${parsed.troco}`, cols));
  }

  // ── FOOTER ──────────────────────────────────────────
  lines.push(divider());
  lines.push(center("Bom apetite!!!"));
  lines.push("");
  lines.push(center("Powered By: TrendFood"));

  return stripDiacritics(lines.join("\n"));
}

/** Remove ##CENTER## and ##BOLD## markers for printers that don't support them. */
export function stripFormatMarkers(text: string): string {
  return text.replace(/##CENTER##/g, "").replace(/##BOLD##/g, "");
}

/** Extract numeric delivery fee from order notes string. Returns 0 if no fee found. */
export function extractDeliveryFee(notes: string | null | undefined): number {
  if (!notes) return 0;
  const parsed = parseNotes(notes);
  if (!parsed.frete) return 0;
  const cleaned = parsed.frete.replace(/[^\d,\.]/g, "").replace(",", ".");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}
