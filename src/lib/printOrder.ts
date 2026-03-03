import QRCode from "qrcode";
import { formatReceiptText, stripFormatMarkers, extractDeliveryFee, parseNotes } from "./formatReceiptText";
import { enqueuePrint } from "./printQueue";
import { sendToBluetoothPrinter } from "./bluetoothPrinter";
import { toast } from "sonner";

export interface PrintableOrder {
  id: string;
  table_number: number;
  created_at: string;
  notes?: string | null;
  order_number?: number;
  order_items?: Array<{ id: string; name: string; quantity: number; price?: number; customer_name?: string | null }>;
}

/** Parse item name to separate base name, addons, and per-item obs (for HTML rendering) */
function parseItemNameHtml(name: string): { baseName: string; addons: string[]; itemObs?: string } {
  let baseName = name;
  let itemObs: string | undefined;
  const addons: string[] = [];

  const obsMatch = baseName.match(/\s*\|\s*Obs:\s*(.+)$/i);
  if (obsMatch) {
    itemObs = obsMatch[1].trim();
    baseName = baseName.slice(0, obsMatch.index).trim();
  }

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

export async function printOrder(
  order: PrintableOrder,
  storeName = "Cozinha",
  pixPayload?: string | null,
  printerWidth: '58mm' | '80mm' = '58mm'
) {
  const is58 = printerWidth === '58mm';
  const win = window.open("", "_blank", "width=400,height=700");
  if (!win) return;

  const dt = new Date(order.created_at);
  const date = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const items = order.order_items ?? [];
  const parsed = order.notes ? parseNotes(order.notes) : null;

  const locationLabel =
    order.table_number === 0
      ? (parsed?.tipo === "Retirada" ? "RETIRADA" : "PARA ENTREGA")
      : `MESA ${order.table_number}`;

  // Estimated delivery time
  let etaHtml = "";
  if (parsed?.tipo !== "Retirada" && order.table_number === 0) {
    const eta1 = new Date(dt.getTime() + 30 * 60000);
    const eta2 = new Date(dt.getTime() + 40 * 60000);
    const fmt = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    etaHtml = `<div class="eta">Previsão: ${fmt(eta1)} - ${fmt(eta2)}</div>`;
  }

  // Items HTML
  const itemsHtml = items.map((item, idx) => {
    const { baseName, addons, itemObs } = parseItemNameHtml(item.name);
    const nameWithCustomer = item.customer_name ? `${baseName} - ${item.customer_name}` : baseName;
    const price = item.price != null ? `R$ ${(item.quantity * item.price).toFixed(2).replace(".", ",")}` : "";
    
    let html = `<tr>
      <td class="num">${idx + 1})</td>
      <td class="name">${nameWithCustomer}</td>
      <td class="dots"></td>
      <td class="price">${price}</td>
    </tr>`;

    for (const addon of addons) {
      html += `<tr><td></td><td class="addon" colspan="3">- ${addon}</td></tr>`;
    }
    if (itemObs) {
      html += `<tr><td></td><td class="item-obs" colspan="3">Obs: ${itemObs}</td></tr>`;
    }
    return html;
  }).join("");

  // Customer section
  let customerHtml = "";
  if (parsed && !parsed.raw) {
    const rows: string[] = [];
    if (parsed.name) rows.push(`<tr><td class="cl">Nome:</td><td class="cv">${parsed.name}</td></tr>`);
    if (parsed.phone) rows.push(`<tr><td class="cl">Tel:</td><td class="cv">${parsed.phone}</td></tr>`);
    if (parsed.doc) rows.push(`<tr><td class="cl">CPF/CNPJ:</td><td class="cv">${parsed.doc}</td></tr>`);
    if (parsed.address) {
      rows.push(`<tr><td class="cl">End.:</td><td class="cv">${parsed.address}</td></tr>`);
      // Extract bairro/cidade
      const addrParts = parsed.address.split(",").map((p) => p.trim());
      if (addrParts.length >= 5) {
        const bairro = addrParts[3] || "";
        const cidade = addrParts[4] || "";
        if (bairro || cidade) {
          rows.push(`<tr><td class="cl">Bairro:</td><td class="cv">${bairro}${cidade ? ` - ${cidade}` : ""}</td></tr>`);
        }
      }
    }
    if (rows.length > 0) {
      customerHtml = `<div class="divider"></div><table class="client-table">${rows.join("")}</table>`;
    }
  }

  // Payment & totals
  const subtotal = items.reduce((sum, item) => sum + (item.price != null ? item.quantity * item.price : 0), 0);
  const deliveryFeeValue = extractDeliveryFee(order.notes);
  const grandTotal = subtotal + deliveryFeeValue;

  let paymentHtml = "";
  if (parsed?.payment) {
    paymentHtml = `<div class="payment-label">Pgto: ${parsed.payment}</div>
                   <div class="charge-notice">* Cobrar do cliente *</div>`;
  }

  let totalHtml = "";
  if (subtotal > 0) {
    if (deliveryFeeValue > 0 || parsed?.frete) {
      const freteLabel = parsed?.frete?.toLowerCase() === "gratis" || parsed?.frete?.toLowerCase() === "grátis"
        ? "Grátis"
        : deliveryFeeValue > 0
          ? `R$ ${deliveryFeeValue.toFixed(2).replace(".", ",")}`
          : parsed?.frete || "A combinar";
      totalHtml += `<div class="subtotal-line">Subtotal: R$ ${subtotal.toFixed(2).replace(".", ",")}</div>`;
      totalHtml += `<div class="subtotal-line">Tx Entrega: ${freteLabel}</div>`;
    }
    totalHtml += `<div class="total-line">TOTAL: R$ ${grandTotal.toFixed(2).replace(".", ",")}</div>`;
  }

  let trocoHtml = "";
  if (parsed?.troco) {
    trocoHtml = `<div class="troco-line">Troco para: ${parsed.troco}</div>`;
  }

  // Observations
  let obsHtml = "";
  if (parsed?.obs) {
    obsHtml = `<div class="obs-line">Obs: ${parsed.obs}</div>`;
  } else if (parsed?.raw) {
    obsHtml = `<div class="obs-line">Obs: ${parsed.raw}</div>`;
  }

  // PIX QR
  let pixHtml = "";
  if (pixPayload && subtotal > 0) {
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

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Pedido ${locationLabel}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: ${is58 ? '12px' : '14px'};
      width: ${is58 ? '58mm' : '80mm'};
      padding: ${is58 ? '4mm 2mm' : '6mm 4mm'};
      color: #000;
      background: #fff;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
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
  <!-- HEADER -->
  <div class="location">${locationLabel}</div>
  <div class="datetime">${date} ${time}</div>
  ${etaHtml}
  <div class="store-name">${storeName}</div>
  ${order.order_number ? `<div class="order-number">PEDIDO #${order.order_number}</div>` : ''}

  <!-- ITEMS -->
  <div class="divider"></div>
  <table class="items">${itemsHtml}</table>
  ${obsHtml}

  <!-- CUSTOMER & DELIVERY -->
  ${customerHtml}

  <!-- PAYMENT & TOTALS -->
  <div class="divider"></div>
  ${paymentHtml}
  ${totalHtml}
  ${trocoHtml}

  <!-- PIX -->
  ${pixHtml}

  <!-- FOOTER -->
  <div class="divider"></div>
  <div class="footer">Bom apetite!!!</div>
  <div class="footer-brand">Powered By: TrendFood</div>
</body>
</html>`;

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
