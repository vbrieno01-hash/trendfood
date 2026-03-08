import QRCode from "qrcode";
import { formatReceiptText, stripFormatMarkers, sanitizeThermalText } from "./formatReceiptText";
import { buildReceiptData, type ReceiptData, type PrintableOrder } from "./receiptData";
import { enqueuePrint } from "./printQueue";
import { sendToBluetoothPrinter } from "./bluetoothPrinter";
import { toast } from "sonner";

// Re-export for backward compatibility
export type { PrintableOrder };

const fmt = (n: number) => n.toFixed(2).replace(".", ",");
/** Strip diacritics for HTML thermal output */
const san = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * Generate HTML for browser print from the SHARED ReceiptData model.
 * This ensures the browser-printed receipt matches the ThermalReceipt component.
 */
function buildPrintHtml(data: ReceiptData, is58: boolean, pixHtml: string, footerQrDataUrl?: string): string {
  // Items HTML
  const itemsHtml = data.items.map((item) => {
    const nameWithCustomer = san(item.customerName ? `${item.baseName} - ${item.customerName}` : item.baseName);
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
  }).join("");

  // Obs HTML
  let obsHtml = "";
  if (data.generalObs) {
    obsHtml = `<div class="obs-line">Obs: ${san(data.generalObs)}</div>`;
  }

  // Customer HTML
  let customerHtml = "";
  if (data.customer) {
    const rows: string[] = [];
    if (data.customer.name) rows.push(`<tr><td class="cl">Nome:</td><td class="cv">${san(data.customer.name)}</td></tr>`);
    if (data.customer.phone) rows.push(`<tr><td class="cl">Tel:</td><td class="cv">${data.customer.phone}</td></tr>`);
    if (data.customer.doc) rows.push(`<tr><td class="cl">CPF/CNPJ:</td><td class="cv">${data.customer.doc}</td></tr>`);
    if (data.customer.address) rows.push(`<tr><td class="cl">End.:</td><td class="cv">${san(data.customer.address)}</td></tr>`);
    if (data.customer.bairro) rows.push(`<tr><td class="cl">Bairro:</td><td class="cv">${san(data.customer.bairro)}</td></tr>`);
    if (data.customer.reference) rows.push(`<tr><td class="cl"><b>Ref.:</b></td><td class="cv"><b>${san(data.customer.reference)}</b></td></tr>`);
    if (rows.length > 0) {
      customerHtml = `<div class="divider"></div><table class="client-table">${rows.join("")}</table>`;
    }
  }

  // ETA
  let etaHtml = "";
  if (data.showEta && data.eta1 && data.eta2) {
    etaHtml = `<div class="eta">Previsão: ${data.eta1} - ${data.eta2}</div>`;
  }

  // Payment
  let paymentHtml = "";
  if (data.paymentMethod) {
    paymentHtml = `<div class="payment-label">Pgto: ${data.paymentMethod}</div>`;
    if (data.showChargeNotice) {
      paymentHtml += `<div class="charge-notice">* Cobrar do cliente *</div>`;
    }
  }

  // Totals (from shared calculation)
  let totalHtml = "";
  const { subtotal, deliveryFee, deliveryFeeLabel, grandTotal } = data.totals;
  if (subtotal > 0) {
    if (deliveryFee > 0 || deliveryFeeLabel) {
      totalHtml += `<div class="subtotal-line">Subtotal: R$ ${fmt(subtotal)}</div>`;
      totalHtml += `<div class="subtotal-line">Tx Entrega: ${deliveryFeeLabel}</div>`;
    }
    totalHtml += `<div class="total-line">TOTAL: R$ ${fmt(grandTotal)}</div>`;
  }

  let trocoHtml = "";
  if (data.troco) {
    trocoHtml = `<div class="troco-line">Troco para: ${data.troco}</div>`;
    if (data.trocoChange != null && data.trocoChange > 0) {
      trocoHtml += `<div class="troco-line" style="font-weight:bold;">Levar de troco: R$ ${fmt(data.trocoChange)}</div>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Pedido ${data.locationLabel}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: ${is58 ? '12px' : '14px'};
      width: ${is58 ? '58mm' : '80mm'};
      padding: ${is58 ? '4mm 2mm' : '6mm 4mm'};
      color: #000; background: #fff; text-transform: uppercase;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 10px 0; padding-top: 4px; }
    .location { font-size: ${is58 ? '16px' : '20px'}; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; text-align: center; margin-bottom: 4px; }
    .datetime { text-align: center; font-size: 12px; }
    .eta { text-align: center; font-size: 11px; margin: 2px 0; }
    .store-name { font-size: ${is58 ? '14px' : '16px'}; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; text-align: center; margin: 6px 0 2px; }
    .store-detail { text-align: center; font-size: 11px; }
    .order-number { font-size: ${is58 ? '18px' : '22px'}; font-weight: bold; text-align: center; margin: 6px 0; letter-spacing: 1px; }
    table.items { width: 100%; border-collapse: collapse; margin: 4px 0; }
    table.items td { padding: 1px 0; vertical-align: top; }
    table.items td.num { width: 20px; font-weight: bold; white-space: nowrap; }
    table.items td.name { padding-left: 2px; }
    table.items td.dots { border-bottom: 1px dotted #000; height: 1em; }
    table.items td.price { text-align: right; white-space: nowrap; font-size: 12px; padding-left: 2px; }
    table.items td.addon { padding-left: 8px; font-size: 11px; }
    table.items td.item-obs { padding-left: 8px; font-size: 11px; font-style: italic; }
    .obs-line { font-size: 11px; margin-top: 4px; padding: 2px 4px; border: 1px solid #000; }
    .client-table { width: 100%; border-collapse: collapse; margin: 4px 0; }
    .client-table td { padding: 1px 0; vertical-align: top; font-size: 12px; }
    .client-table td.cl { white-space: nowrap; font-weight: bold; padding-right: 4px; width: 70px; }
    .client-table td.cv { word-break: break-word; }
    .payment-label { text-align: center; font-size: 12px; margin-top: 4px; }
    .charge-notice { text-align: center; font-weight: bold; font-size: ${is58 ? '13px' : '14px'}; margin: 4px 0; }
    .subtotal-line { text-align: right; font-size: 12px; }
    .total-line { text-align: right; font-size: ${is58 ? '14px' : '16px'}; font-weight: bold; margin: 4px 0 2px; letter-spacing: 0.5px; }
    .troco-line { text-align: right; font-size: 12px; }
    .pix-section { text-align: center; padding: 6px 0; }
    .qr-img { width: ${is58 ? '120px' : '160px'}; height: auto; display: block; margin: 0 auto 4px; }
    .pix-label { font-size: 12px; font-weight: bold; }
    .footer { text-align: center; margin-top: 4px; font-size: 12px; font-weight: bold; }
    .footer-brand { text-align: center; font-size: 11px; margin-top: 4px; letter-spacing: 1px; }
    @media print {
      body { width: ${is58 ? '58mm' : '80mm'}; }
      @page { margin: 0; size: ${is58 ? '58mm' : '80mm'} auto; }
    }
  </style>
</head>
<body>
  <div class="location">${san(data.locationLabel)}</div>
  <div class="datetime">${data.date} ${data.time}</div>
  ${etaHtml}
  <div class="store-name">${san(data.storeName)}</div>
  ${data.storeAddress ? `<div class="store-detail">${san(data.storeAddress)}</div>` : ''}
  ${data.storeContact ? `<div class="store-detail">${san(data.storeContact)}</div>` : ''}
  ${data.cnpj ? `<div class="store-detail">CNPJ: ${data.cnpj}</div>` : ''}
  ${data.orderNumber ? `<div class="order-number">PEDIDO #${data.orderNumber}</div>` : ''}

  <div class="divider"></div>
  <table class="items">${itemsHtml}</table>
  ${obsHtml}

  ${customerHtml}

  <div class="divider"></div>
  ${paymentHtml}
  ${totalHtml}
  ${trocoHtml}

  ${pixHtml}

  <div class="divider"></div>
  <div class="footer">Bom apetite!!!</div>
  <div class="footer-brand">Powered By: TrendFood</div>
  ${footerQrDataUrl ? `<div style="text-align:center;margin-top:6px;"><img src="${footerQrDataUrl}" alt="QR" style="width:80px;height:80px;display:inline-block;" /></div>` : '<div style="text-align:center;font-size:10px;margin-top:4px;">Acesse: https://trendfood.lovable.app/</div>'}
</body>
</html>`;
}

export async function printOrder(
  order: PrintableOrder,
  storeName = "Cozinha",
  pixPayload?: string | null,
  printerWidth: '58mm' | '80mm' = '58mm'
) {
  const is58 = printerWidth === '58mm';
  const win = window.open("", "_blank", "width=400,height=700");
  if (!win) return;

  // Build shared data model (SINGLE SOURCE OF TRUTH for calculations)
  const data = buildReceiptData(order, storeName);

  // PIX QR
  let pixHtml = "";
  if (pixPayload && data.totals.subtotal > 0) {
    try {
      const qrDataUrl = await QRCode.toDataURL(pixPayload, {
        width: is58 ? 150 : 200,
        margin: 1,
        errorCorrectionLevel: "M",
      });
      pixHtml = `<div class="divider"></div>
        <div class="pix-section">
          <img src="${qrDataUrl}" alt="QR Code PIX" class="qr-img" />
          <p class="pix-label">Pague com Pix</p>
        </div>`;
    } catch { /* QR code generation failed */ }
  }

  // Footer QR code
  let footerQrDataUrl: string | undefined;
  try {
    footerQrDataUrl = await QRCode.toDataURL("https://trendfood.lovable.app/", {
      width: 80, margin: 1, errorCorrectionLevel: "L",
    });
  } catch { /* ignore */ }

  const html = buildPrintHtml(data, is58, pixHtml, footerQrDataUrl);

  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 500);
}

// ─── Multi-mode print dispatcher ──────────────────────────────────────────────

export async function printOrderByMode(
  order: PrintableOrder,
  storeName: string | undefined,
  printMode: 'browser' | 'desktop' | 'bluetooth',
  orgId: string,
  btDevice: BluetoothDevice | null,
  pixPayload?: string | null,
  printerWidth: '58mm' | '80mm' = '58mm'
) {
  if (printMode === "browser") {
    return printOrder(order, storeName, pixPayload, printerWidth);
  }

  const text = formatReceiptText(order, storeName, printerWidth);

  if (printMode === "desktop") {
    try {
      await enqueuePrint(orgId, order.id, stripFormatMarkers(text));
      toast.success("Pedido enviado para impressão");
    } catch {
      toast.error("Erro ao enviar para fila de impressão");
    }
    return;
  }

  if (printMode === "bluetooth") {
    if (btDevice) {
      const success = await sendToBluetoothPrinter(btDevice, text);
      if (success) {
        toast.success("Impresso via Bluetooth");
        return;
      }
      toast.warning("Bluetooth falhou, salvando na fila...", {
        description: "Verifique se a impressora está ligada e próxima.",
      });
    } else {
      toast.warning("Nenhuma impressora Bluetooth pareada, salvando na fila...");
    }
    try {
      await enqueuePrint(orgId, order.id, stripFormatMarkers(text));
      toast.info("Pedido salvo na fila de impressão");
    } catch {
      toast.error("Erro ao salvar na fila de impressão");
    }
  }
}
