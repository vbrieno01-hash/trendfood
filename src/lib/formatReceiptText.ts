/**
 * formatReceiptText — generates plain-text receipt for Bluetooth & Desktop queue.
 * Uses the SHARED receiptData model for calculations (Single Source of Truth).
 */

import type { PrintableOrder } from "./receiptData";
import { buildReceiptData, type ReceiptData } from "./receiptData";
import type { StoreInfo } from "./receiptData";

// Re-export for backward compatibility
export type { StoreInfo };

export interface ParsedNotes {
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

/**
 * Sanitize text for thermal printers:
 * 1. Strip diacritics (á→a, ç→c, etc.)
 * 2. Remove format markers (##BOLD##, ##CENTER##)
 * 3. Uppercase everything
 * 4. Keep only A-Z, 0-9, spaces, and essential punctuation
 */
export function sanitizeThermalText(text: string): string {
  return text
    // Strip diacritics
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    // Remove format markers before uppercasing
    .replace(/##CENTER##/g, "").replace(/##BOLD##/g, "")
    // Uppercase
    .toUpperCase()
    // Keep only safe chars: letters, digits, spaces, and essential punctuation
    .replace(/[^A-Z0-9 :$,.\-*/()@#\n]/g, "");
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

const fmt = (n: number) => n.toFixed(2).replace(".", ",");

/**
 * Generate plain-text receipt from shared ReceiptData.
 * This ensures text output matches the visual ThermalReceipt component exactly.
 */
function formatFromData(data: ReceiptData): string {
  const cols = MAX_COLS;
  const lines: string[] = [];

  // ── HEADER
  lines.push(center(bold(data.locationLabel)));
  lines.push("");
  lines.push(center(`${data.date} ${data.time}`));
  if (data.showEta && data.eta1 && data.eta2) {
    lines.push(center(`Previsao: ${data.eta1} - ${data.eta2}`));
  }
  lines.push("");
  lines.push(center(bold(data.storeName.toUpperCase())));
  if (data.storeAddress) lines.push(center(data.storeAddress));
  if (data.storeContact) lines.push(center(data.storeContact));
  if (data.cnpj) lines.push(center(`CNPJ: ${data.cnpj}`));
  if (data.orderNumber) {
    lines.push("");
    lines.push(center(bold(`PEDIDO #${data.orderNumber}`)));
  }

  // ── ITEMS
  lines.push("");
  lines.push(divider());
  lines.push("");
  for (const item of data.items) {
    const nameWithCustomer = item.customerName
      ? `${item.baseName} - ${item.customerName}`
      : item.baseName;
    const left = `${item.quantity}x ${nameWithCustomer}`;
    const price = item.lineTotal > 0 ? `R$ ${fmt(item.lineTotal)}` : "";

    if (!price) {
      lines.push(...wrapLine(left, cols));
    } else {
      const minDots = 3;
      const available = cols - left.length - price.length;
      if (available >= minDots) {
        lines.push(left + ".".repeat(available) + price);
      } else if (left.length + 1 + price.length <= cols) {
        lines.push(left + " ".repeat(Math.max(1, cols - left.length - price.length)) + price);
      } else {
        lines.push(...wrapLine(left, cols));
        lines.push(rightAlign(price, cols));
      }
    }
    for (const addon of item.addons) {
      lines.push(`   - ${addon}`);
    }
    if (item.itemObs) {
      lines.push(...wrapLine(`   Obs: ${item.itemObs}`, cols));
    }
  }

  // ── OBS
  if (data.generalObs) {
    lines.push("");
    lines.push(...wrapLine(`Obs: ${data.generalObs}`, cols));
  }

  // ── CUSTOMER
  if (data.customer) {
    lines.push("");
    lines.push(divider());
    lines.push("");
    if (data.customer.name) lines.push(...wrapLine(`Nome: ${data.customer.name}`, cols));
    if (data.customer.phone) lines.push(...wrapLine(`Tel: ${data.customer.phone}`, cols));
    if (data.customer.doc) lines.push(...wrapLine(`CPF/CNPJ: ${data.customer.doc}`, cols));
    if (data.customer.address) lines.push(...wrapLine(`End.: ${data.customer.address}`, cols));
    if (data.customer.bairro) lines.push(`Bairro: ${data.customer.bairro}`);
    if (data.customer.reference) lines.push(bold(`Ref.: ${data.customer.reference}`));
  }

  // ── PAYMENT & TOTALS
  lines.push("");
  lines.push(divider());
  lines.push("");
  if (data.paymentMethod) {
    lines.push(center(`Pgto: ${data.paymentMethod}`));
    if (data.showChargeNotice) {
      lines.push(center(bold("* Cobrar do cliente *")));
    }
    lines.push("");
  }

  const { subtotal, deliveryFee, deliveryFeeLabel, grandTotal } = data.totals;
  if (subtotal > 0) {
    if (deliveryFee > 0 || deliveryFeeLabel) {
      lines.push(rightAlign(`Subtotal: R$ ${fmt(subtotal)}`, cols));
      lines.push(rightAlign(`Tx Entrega: ${deliveryFeeLabel}`, cols));
    }
    lines.push(bold(rightAlign(`TOTAL: R$ ${fmt(grandTotal)}`, cols)));
  }

  if (data.troco) {
    lines.push(rightAlign(`Troco para: ${data.troco}`, cols));
    if (data.trocoChange != null && data.trocoChange > 0) {
      lines.push(bold(rightAlign(`Levar de troco: R$ ${fmt(data.trocoChange)}`, cols)));
    }
  }

  // ── FOOTER
  lines.push("");
  lines.push(divider());
  lines.push("");
  lines.push(center("Bom apetite!!!"));
  lines.push("");
  lines.push(center("Powered By: TrendFood"));
  lines.push(center("Acesse: https://trendfood.lovable.app/"));
  return sanitizeThermalText(lines.join("\n"));
}

export function formatReceiptText(
  order: PrintableOrder,
  storeInfo: StoreInfo | string = "Cozinha",
  _printerWidth: "58mm" | "80mm" = "58mm"
): string {
  const data = buildReceiptData(order, storeInfo);
  return formatFromData(data);
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
