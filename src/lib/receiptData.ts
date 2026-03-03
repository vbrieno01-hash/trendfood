/**
 * SINGLE SOURCE OF TRUTH for receipt data model and calculations.
 * All receipt consumers (Preview, Browser Print, Bluetooth, Desktop Queue)
 * MUST use these types and functions.
 *
 * NOTE: This file must NOT import from printOrder.ts or formatReceiptText.ts
 * to avoid circular dependencies. parseNotes is inlined here.
 */

export interface PrintableOrder {
  id: string;
  table_number: number;
  created_at: string;
  notes?: string | null;
  order_number?: number;
  order_items?: Array<{ id: string; name: string; quantity: number; price?: number; customer_name?: string | null }>;
}

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

function parseNotesInternal(notes: string): ParsedNotes {
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

// ── Shared Types ──────────────────────────────────────────────────────────────

export interface ReceiptItem {
  index: number;
  baseName: string;
  addons: string[];
  itemObs?: string;
  customerName?: string;
  quantity: number;
  lineTotal: number; // quantity * unitPrice
}

export interface ReceiptCustomer {
  name?: string;
  phone?: string;
  doc?: string;
  address?: string;
  bairro?: string;
  reference?: string;
}

export interface ReceiptTotals {
  subtotal: number;
  deliveryFee: number;
  deliveryFeeLabel: string; // "R$ 6,00" | "Grátis" | "A combinar"
  grandTotal: number;
}

export interface ReceiptData {
  locationLabel: string; // "PARA ENTREGA" | "RETIRADA" | "MESA 5"
  date: string;
  time: string;
  showEta: boolean;
  eta1?: string;
  eta2?: string;
  storeName: string;
  storeAddress?: string;
  storeContact?: string;
  cnpj?: string;
  orderNumber?: number;
  items: ReceiptItem[];
  generalObs?: string;
  customer?: ReceiptCustomer;
  paymentMethod?: string;
  showChargeNotice: boolean;
  totals: ReceiptTotals;
  troco?: string;
}

export interface StoreInfo {
  name: string;
  address?: string;
  contact?: string;
  cnpj?: string;
}

// ── Item name parser ──────────────────────────────────────────────────────────

export function parseItemName(name: string): { baseName: string; addons: string[]; itemObs?: string } {
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

// ── Centralized total calculation ─────────────────────────────────────────────

export function calcOrderTotals(
  items: Array<{ quantity: number; price?: number | null }>,
  freteString?: string | null
): ReceiptTotals {
  const subtotal = items.reduce(
    (sum, item) => sum + (item.price != null ? item.quantity * item.price : 0),
    0
  );

  let deliveryFee = 0;
  let deliveryFeeLabel = "";

  if (freteString) {
    const lower = freteString.toLowerCase().trim();
    if (lower === "gratis" || lower === "grátis") {
      deliveryFeeLabel = "Grátis";
    } else {
      const cleaned = freteString.replace(/[^\d,\.]/g, "").replace(",", ".");
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed) && parsed > 0) {
        deliveryFee = parsed;
        deliveryFeeLabel = `R$ ${deliveryFee.toFixed(2).replace(".", ",")}`;
      } else {
        deliveryFeeLabel = freteString || "Sob consulta";
      }
    }
  }

  return {
    subtotal,
    deliveryFee,
    deliveryFeeLabel,
    grandTotal: subtotal + deliveryFee,
  };
}

// ── Build ReceiptData from a PrintableOrder ───────────────────────────────────

export function buildReceiptData(order: PrintableOrder, storeInfo: StoreInfo | string): ReceiptData {
  const info: StoreInfo = typeof storeInfo === "string" ? { name: storeInfo } : storeInfo;
  const parsed = order.notes ? parseNotesInternal(order.notes) : null;

  const locationLabel =
    order.table_number === 0
      ? parsed?.tipo === "Retirada"
        ? "RETIRADA"
        : "PARA ENTREGA"
      : `MESA ${order.table_number}`;

  const dt = new Date(order.created_at);
  const date = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const showEta = parsed?.tipo !== "Retirada" && order.table_number === 0;
  let eta1: string | undefined;
  let eta2: string | undefined;
  if (showEta) {
    const fmt = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    eta1 = fmt(new Date(dt.getTime() + 30 * 60000));
    eta2 = fmt(new Date(dt.getTime() + 40 * 60000));
  }

  const rawItems = order.order_items ?? [];
  const items: ReceiptItem[] = rawItems.map((item, idx) => {
    const { baseName, addons, itemObs } = parseItemName(item.name);
    return {
      index: idx + 1,
      baseName,
      addons,
      itemObs,
      customerName: item.customer_name || undefined,
      quantity: item.quantity,
      lineTotal: item.price != null ? item.quantity * item.price : 0,
    };
  });

  // Customer
  let customer: ReceiptCustomer | undefined;
  if (parsed && !parsed.raw) {
    customer = {
      name: parsed.name,
      phone: parsed.phone,
      doc: parsed.doc,
      address: parsed.address,
    };
    if (parsed.address) {
      const parts = parsed.address.split(",").map((p) => p.trim());
      // Extract bairro/cidade
      if (parts.length >= 5) {
        const bairro = parts[3] || "";
        const cidade = parts[4] || "";
        if (bairro || cidade) {
          customer.bairro = `${bairro}${cidade ? ` - ${cidade}` : ""}`;
        }
      }
      // Extract reference (last meaningful part or REF field)
      if (parsed.address.toLowerCase().includes("ref")) {
        const refMatch = parsed.address.match(/ref[.:]\s*(.+?)(?:,|$)/i);
        if (refMatch) customer.reference = refMatch[1].trim();
      }
    }
  }

  // General observations
  let generalObs: string | undefined;
  if (parsed?.obs) generalObs = parsed.obs;
  else if (parsed?.raw) generalObs = parsed.raw;

  // Totals (SINGLE calculation)
  const totals = calcOrderTotals(rawItems, parsed?.frete);

  return {
    locationLabel,
    date,
    time,
    showEta,
    eta1,
    eta2,
    storeName: info.name,
    storeAddress: info.address,
    storeContact: info.contact,
    cnpj: info.cnpj,
    orderNumber: order.order_number,
    items,
    generalObs,
    customer,
    paymentMethod: parsed?.payment,
    showChargeNotice: !!parsed?.payment,
    totals,
    troco: parsed?.troco,
  };
}

// ── Demo data for ReceiptPreview ──────────────────────────────────────────────

export function buildDemoReceiptData(storeInfo: StoreInfo): ReceiptData {
  const now = new Date();
  const date = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const fmt = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return {
    locationLabel: "PARA ENTREGA",
    date,
    time,
    showEta: true,
    eta1: fmt(new Date(now.getTime() + 30 * 60000)),
    eta2: fmt(new Date(now.getTime() + 40 * 60000)),
    storeName: storeInfo.name || "NOME DA LOJA",
    storeAddress: storeInfo.address,
    storeContact: storeInfo.contact,
    cnpj: storeInfo.cnpj,
    orderNumber: 42,
    items: [
      { index: 1, baseName: "X-Burguer", addons: ["Bacon", "Cheddar"], quantity: 1, lineTotal: 25.00 },
      { index: 2, baseName: "Coca-Cola 600ml", addons: [], quantity: 1, lineTotal: 10.00 },
    ],
    generalObs: "Sem cebola",
    customer: {
      name: "João da Silva",
      phone: "(11) 99999-0000",
      address: "Rua das Flores, 123, Apto 4",
      bairro: "Centro - São Paulo",
      reference: "Próximo ao mercado",
    },
    paymentMethod: "Dinheiro",
    showChargeNotice: true,
    totals: {
      subtotal: 35.00,
      deliveryFee: 6.00,
      deliveryFeeLabel: "R$ 6,00",
      grandTotal: 41.00,
    },
    troco: "R$ 50,00",
  };
}
