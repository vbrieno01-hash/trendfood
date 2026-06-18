/**
 * 2ª via "Via do Entregador" para pedidos iFood.
 *
 * Isolado: reusa buildReceiptData/formatFromData/buildPrintHtml indiretamente,
 * mas REMOVE o CPF e metadados sensíveis (CNPJ_INTERMED, AUT, TAXAS_IFOOD)
 * antes de renderizar. Adiciona cabeçalho "*** VIA DO ENTREGADOR ***".
 *
 * NÃO afeta a comanda padrão do TrendFood — só roda quando explicitamente chamado
 * para pedidos com gateway_payment_id LIKE 'ifood:%'.
 */

import QRCode from "qrcode";
import {
  buildReceiptData,
  type PrintableOrder,
  type ReceiptData,
  type StoreInfo,
} from "./receiptData";
import { formatReceiptText, stripFormatMarkers } from "./formatReceiptText";
import { enqueuePrint } from "./printQueue";
import { sendToBluetoothPrinter } from "./bluetoothPrinter";
import { toast } from "sonner";
import { getPublicBaseUrl } from "./publicUrl";

const COURIER_HEADER = "*** VIA DO ENTREGADOR ***";

/** Filtra linhas sensíveis das observações vindas de pedidos iFood */
function sanitizeCourierObs(obs?: string): string | undefined {
  if (!obs) return undefined;
  const filtered = obs
    .split(/\r?\n/)
    .filter((l) => !/^\s*(CPF|CNPJ_INTERMED|AUT)\s*[:=]/i.test(l))
    .join("\n")
    .trim();
  return filtered || undefined;
}

/** Build a sanitized ReceiptData for a courier copy (no CPF, no sensitive notes). */
export function buildCourierReceiptData(
  order: PrintableOrder,
  storeInfo: StoreInfo | string,
): ReceiptData {
  // Strip CPF/CNPJ/AUT from notes BEFORE building data (parser would pull DOC into customer.doc)
  const sanitizedOrder: PrintableOrder = {
    ...order,
    notes: order.notes ? sanitizeNotesString(order.notes) : order.notes,
  };
  const data = buildReceiptData(sanitizedOrder, storeInfo);
  if (data.customer) {
    data.customer = { ...data.customer, doc: undefined };
  }
  data.generalObs = sanitizeCourierObs(data.generalObs);
  return data;
}

/** Remove DOC|CPF|CNPJ pipe-segments from raw notes (keeps everything else intact). */
function sanitizeNotesString(notes: string): string {
  if (!notes.includes("|")) return notes;
  return notes
    .split("|")
    .filter((part) => {
      const idx = part.indexOf(":");
      if (idx < 0) return true;
      const key = part.slice(0, idx).trim().toUpperCase();
      return key !== "DOC" && key !== "CPF" && key !== "CNPJ_INTERMED" && key !== "AUT";
    })
    .join("|");
}

/** Plain-text courier copy for Bluetooth/Desktop queue. */
export function formatCourierReceiptText(
  order: PrintableOrder,
  storeInfo: StoreInfo | string = "Cozinha",
  printerWidth: "58mm" | "80mm" = "58mm",
): string {
  const sanitizedOrder: PrintableOrder = {
    ...order,
    notes: order.notes ? sanitizeNotesString(order.notes) : order.notes,
  };
  const base = formatReceiptText(sanitizedOrder, storeInfo, printerWidth);
  // Prepend courier header (sanitized text is already uppercase ASCII)
  return `${COURIER_HEADER}\n${"-".repeat(32)}\n${base}`;
}

const fmt = (n: number) => n.toFixed(2).replace(".", ",");
const san = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Browser-window HTML print for the courier copy. */
async function printCourierBrowser(
  data: ReceiptData,
  is58: boolean,
): Promise<void> {
  const win = window.open("", "_blank", "width=400,height=700");
  if (!win) return;

  const itemsHtml = data.items
    .map((item) => {
      const nameWithCustomer = san(
        item.customerName ? `${item.baseName} - ${item.customerName}` : item.baseName,
      );
      const price = item.lineTotal > 0 ? `R$ ${fmt(item.lineTotal)}` : "";
      let html = `<tr>
        <td class="num">${item.index})</td>
        <td class="name">${nameWithCustomer}</td>
        <td class="dots"></td>
        <td class="price">${price}</td>
      </tr>`;
      for (const addon of item.addons) {
        html += `<tr><td></td><td class="addon" colspan="3">- ${san(addon)}</td></tr>`;
      }
      if (item.itemObs) {
        html += `<tr><td></td><td class="item-obs" colspan="3">Obs: ${san(item.itemObs)}</td></tr>`;
      }
      return html;
    })
    .join("");

  let customerHtml = "";
  if (data.customer) {
    const rows: string[] = [];
    if (data.customer.name) rows.push(`<tr><td class="cl">Nome:</td><td class="cv">${san(data.customer.name)}</td></tr>`);
    if (data.customer.phone) rows.push(`<tr><td class="cl">Tel:</td><td class="cv">${data.customer.phone}</td></tr>`);
    // doc intentionally OMITTED for courier copy
    if (data.customer.address) rows.push(`<tr><td class="cl">End.:</td><td class="cv">${san(data.customer.address)}</td></tr>`);
    if (data.customer.bairro) rows.push(`<tr><td class="cl">Bairro:</td><td class="cv">${san(data.customer.bairro)}</td></tr>`);
    if (data.customer.reference) rows.push(`<tr><td class="cl"><b>Ref.:</b></td><td class="cv"><b>${san(data.customer.reference)}</b></td></tr>`);
    if (rows.length > 0) {
      customerHtml = `<div class="divider"></div><table class="client-table">${rows.join("")}</table>`;
    }
  }

  const obsHtml = data.generalObs
    ? `<div class="obs-line">Obs: ${san(data.generalObs)}</div>`
    : "";

  const { subtotal, deliveryFee, deliveryFeeLabel, grandTotal } = data.totals;
  let totalHtml = "";
  if (subtotal > 0) {
    if (deliveryFee > 0 || deliveryFeeLabel) {
      totalHtml += `<div class="subtotal-line">Subtotal: R$ ${fmt(subtotal)}</div>`;
      totalHtml += `<div class="subtotal-line">Tx Entrega: ${deliveryFeeLabel}</div>`;
    }
    totalHtml += `<div class="total-line">TOTAL: R$ ${fmt(grandTotal)}</div>`;
  }

  const paymentHtml = data.paymentMethod
    ? `<div class="payment-label">Pgto: ${data.paymentMethod}</div>`
    : "";

  let footerQrDataUrl = "";
  try {
    footerQrDataUrl = await QRCode.toDataURL(`${getPublicBaseUrl()}/`, {
      width: 120, margin: 1, errorCorrectionLevel: "M",
    });
  } catch { /* noop */ }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Via do Entregador ${data.locationLabel}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family:'Courier New',Courier,monospace;
      font-size:${is58 ? "12px" : "14px"};
      width:${is58 ? "58mm" : "80mm"};
      padding:${is58 ? "4mm 2mm" : "6mm 4mm"};
      color:#000; background:#fff; text-transform:uppercase;
    }
    .center { text-align:center; }
    .bold { font-weight:bold; }
    .divider { border-top:1px dashed #000; margin:10px 0; padding-top:4px; }
    .courier-banner {
      text-align:center; font-weight:bold;
      font-size:${is58 ? "14px" : "16px"};
      border:2px solid #000; padding:4px; margin-bottom:6px; letter-spacing:1px;
    }
    .location { font-size:${is58 ? "16px" : "20px"}; font-weight:bold; text-align:center; margin-bottom:4px; letter-spacing:1px; }
    .datetime { text-align:center; font-size:12px; }
    .store-name { font-size:${is58 ? "14px" : "16px"}; font-weight:bold; text-align:center; margin:6px 0 2px; letter-spacing:1px; }
    .store-detail { text-align:center; font-size:11px; }
    .order-number { font-size:${is58 ? "18px" : "22px"}; font-weight:bold; text-align:center; margin:6px 0; letter-spacing:1px; }
    table.items { width:100%; border-collapse:collapse; margin:4px 0; }
    table.items td { padding:1px 0; vertical-align:top; }
    table.items td.num { width:20px; font-weight:bold; white-space:nowrap; }
    table.items td.name { padding-left:2px; }
    table.items td.dots { border-bottom:1px dotted #000; height:1em; }
    table.items td.price { text-align:right; white-space:nowrap; font-size:12px; padding-left:2px; }
    table.items td.addon { padding-left:8px; font-size:11px; }
    table.items td.item-obs { padding-left:8px; font-size:11px; font-style:italic; }
    .obs-line { font-size:11px; margin-top:4px; padding:2px 4px; border:1px solid #000; }
    .client-table { width:100%; border-collapse:collapse; margin:4px 0; }
    .client-table td { padding:1px 0; vertical-align:top; font-size:12px; }
    .client-table td.cl { white-space:nowrap; font-weight:bold; padding-right:4px; width:70px; }
    .client-table td.cv { word-break:break-word; }
    .payment-label { text-align:center; font-size:12px; margin-top:4px; }
    .subtotal-line { text-align:right; font-size:12px; }
    .total-line { text-align:right; font-size:${is58 ? "14px" : "16px"}; font-weight:bold; margin:4px 0 2px; letter-spacing:0.5px; }
    .footer { text-align:center; margin-top:4px; font-size:11px; }
    @media print { body { width:${is58 ? "58mm" : "80mm"}; } @page { margin:0; size:${is58 ? "58mm" : "80mm"} auto; } }
  </style>
</head>
<body>
  <div class="courier-banner">VIA DO ENTREGADOR</div>
  <div class="location">${san(data.locationLabel)}</div>
  <div class="datetime">${data.date} ${data.time}</div>
  <div class="store-name">${san(data.storeName)}</div>
  ${data.storeContact ? `<div class="store-detail">${san(data.storeContact)}</div>` : ""}
  ${data.orderNumber ? `<div class="order-number">PEDIDO #${data.orderNumber}</div>` : ""}

  <div class="divider"></div>
  <table class="items">${itemsHtml}</table>
  ${obsHtml}

  ${customerHtml}

  <div class="divider"></div>
  ${paymentHtml}
  ${totalHtml}

  <div class="divider"></div>
  <div class="footer">Sem CPF — Via para entregador</div>
  ${footerQrDataUrl ? `<div style="text-align:center;margin-top:6px;"><img src="${footerQrDataUrl}" alt="QR" style="width:80px;height:80px;display:inline-block;" /></div>` : ""}
</body>
</html>`;

  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 500);
}

/**
 * Print a sanitized courier copy in the configured mode.
 * Only call this for iFood orders (gateway_payment_id LIKE 'ifood:%').
 */
export async function printCourierCopyByMode(
  order: PrintableOrder,
  storeInfo: StoreInfo | string | undefined,
  printMode: "browser" | "desktop" | "bluetooth",
  orgId: string,
  btDevice: BluetoothDevice | null,
  printerWidth: "58mm" | "80mm" = "58mm",
): Promise<void> {
  const is58 = printerWidth === "58mm";

  if (printMode === "browser") {
    const data = buildCourierReceiptData(order, storeInfo ?? "Cozinha");
    await printCourierBrowser(data, is58);
    return;
  }

  const text = formatCourierReceiptText(order, storeInfo ?? "Cozinha", printerWidth);

  if (printMode === "desktop") {
    try {
      // Always enqueue with null order_id so the unique constraint doesn't block this 2nd copy
      await enqueuePrint(orgId, null, stripFormatMarkers(text));
      toast.success("Via do entregador enviada para impressão");
    } catch {
      toast.error("Erro ao enviar via do entregador");
    }
    return;
  }

  if (printMode === "bluetooth") {
    if (btDevice) {
      const success = await sendToBluetoothPrinter(btDevice, text);
      if (success) {
        toast.success("Via do entregador impressa via Bluetooth");
        return;
      }
    }
    try {
      await enqueuePrint(orgId, null, stripFormatMarkers(text));
      toast.info("Via do entregador salva na fila");
    } catch {
      toast.error("Erro ao salvar via do entregador na fila");
    }
  }
}

/** Helper: returns true when an order originated from iFood. */
export function isIFoodOrder(order: { gateway_payment_id?: string | null }): boolean {
  const gpid = order.gateway_payment_id;
  return typeof gpid === "string" && gpid.startsWith("ifood:");
}