import QRCode from "qrcode";
import { formatReceiptText, stripFormatMarkers } from "./formatReceiptText";
import { enqueuePrint } from "./printQueue";
import { sendToBluetoothPrinter } from "./bluetoothPrinter";
import { toast } from "sonner";

export interface PrintableOrder {
  id: string;
  table_number: number;
  created_at: string;
  notes?: string | null;
  order_items?: Array<{ id: string; name: string; quantity: number; price?: number; customer_name?: string | null }>;
}

// ─── Notes parser ─────────────────────────────────────────────────────────────

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

// ─── Main print function ───────────────────────────────────────────────────────

export async function printOrder(
  order: PrintableOrder,
  storeName = "Cozinha",
  pixPayload?: string | null,
  printerWidth: '58mm' | '80mm' = '58mm'
) {
  const is58 = printerWidth === '58mm';
  const win = window.open("", "_blank", "width=400,height=700");
  if (!win) return; // blocked by popup blocker

  const date = new Date(order.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

  const time = new Date(order.created_at).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const items = order.order_items ?? [];

  const itemsHtml = items
    .map(
      (item) =>
        `<tr>
          <td class="qty">${item.quantity}x</td>
          <td class="name">${item.name}${item.customer_name ? ` <span class="cname">— ${item.customer_name}</span>` : ""}</td>
          <td class="price">${item.price != null ? "R$ " + (item.quantity * item.price).toFixed(2).replace(".", ",") : ""}</td>
        </tr>`
    )
    .join("");

  const parsed = order.notes ? parseNotes(order.notes) : null;

  // For table orders or legacy unstructured notes: show as plain obs
  const notesHtml = parsed?.raw
    ? `<div class="notes"><strong>Obs:</strong> ${parsed.raw}</div>`
    : "";

  // Structured customer info block (delivery orders with new format)
  const customerRows: Array<[string, string]> = [];
  if (parsed && !parsed.raw) {
    if (parsed.name)    customerRows.push(["Nome:",      parsed.name]);
    if (parsed.phone)   customerRows.push(["Tel:",       parsed.phone]);
    if (parsed.address) customerRows.push(["End.:",      parsed.address]);
    if (parsed.frete)   customerRows.push(["Frete:",     parsed.frete]);
    if (parsed.payment) customerRows.push(["Pgto:",      parsed.payment]);
    if (parsed.doc)     customerRows.push(["CPF/CNPJ:", parsed.doc]);
    if (parsed.obs)     customerRows.push(["Obs:",       parsed.obs]);
  }

  const customerHtml = customerRows.length > 0
    ? `<div class="divider"></div>
       <table class="client-table">
         ${customerRows.map(([label, value]) =>
           `<tr><td class="cl">${label}</td><td class="cv">${value}</td></tr>`
         ).join("")}
       </table>`
    : "";

  const locationLabel = order.table_number === 0
    ? (parsed?.tipo === "Retirada" ? "RETIRADA" : "ENTREGA")
    : `MESA ${order.table_number}`;

  // Calculate total
  const total = items.reduce((sum, item) => {
    return sum + (item.price != null ? item.quantity * item.price : 0);
  }, 0);

  const hasTotal = total > 0;
  const totalHtml = hasTotal
    ? `<div class="total">TOTAL: R$ ${total.toFixed(2).replace(".", ",")}</div>`
    : "";

  // Generate PIX QR Code from pre-built payload
  let pixHtml = "";
  if (pixPayload && hasTotal) {
    try {
      const qrDataUrl = await QRCode.toDataURL(pixPayload, {
        width: is58 ? 150 : 200,
        margin: 1,
        errorCorrectionLevel: "M",
      });
      pixHtml = `
        <div class="divider"></div>
        <div class="pix-section">
          <img src="${qrDataUrl}" alt="QR Code PIX" class="qr-img" />
          <p class="pix-label">📱 Pague com Pix</p>
        </div>`;
    } catch {
      // QR code generation failed — print without it
    }
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
    }
    .header {
      text-align: center;
      margin-bottom: 8px;
    }
    .store-name {
      font-size: ${is58 ? '14px' : '16px'};
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .divider {
      border-top: 1px dashed #000;
      margin: 6px 0;
    }
    .mesa-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 2px;
    }
    .mesa {
      font-size: ${is58 ? '18px' : '22px'};
      font-weight: bold;
    }
    .time {
      font-size: 12px;
      color: #333;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
    }
    td { padding: 2px 0; vertical-align: top; }
    td.qty {
      width: 28px;
      font-weight: bold;
      white-space: nowrap;
    }
    td.name { padding-left: 4px; }
    td.price {
      text-align: right;
      white-space: nowrap;
      font-size: 12px;
      color: #333;
    }
    .notes {
      margin-top: 6px;
      font-size: 12px;
      background: #f5f5f5;
      border: 1px solid #ccc;
      padding: 4px 6px;
      border-radius: 2px;
    }
    .total {
      font-size: ${is58 ? '14px' : '16px'};
      font-weight: bold;
      text-align: right;
      margin: 6px 0 2px;
      letter-spacing: 0.5px;
    }
    .pix-section {
      text-align: center;
      padding: 6px 0;
    }
    .qr-img {
      width: ${is58 ? '120px' : '160px'};
      height: ${is58 ? '120px' : '160px'};
      display: block;
      margin: 0 auto 4px;
    }
    .pix-label {
      font-size: 12px;
      font-weight: bold;
      letter-spacing: 0.5px;
    }
    .client-table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
    }
    .client-table td { padding: 2px 0; vertical-align: top; }
    .client-table td.cl {
      white-space: nowrap;
      font-weight: bold;
      padding-right: 6px;
      font-size: 12px;
      width: 72px;
    }
    .client-table td.cv {
      font-size: 12px;
      word-break: break-word;
    }
    .cname {
      font-weight: normal;
      font-size: 11px;
      color: #555;
    }
    .footer {
      text-align: center;
      margin-top: 8px;
      font-size: 11px;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #555;
    }
    @media print {
      body { width: ${is58 ? '58mm' : '80mm'}; }
      @page { margin: 0; size: ${is58 ? '58mm' : '80mm'} auto; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="store-name">${storeName}</div>
  </div>
  <div class="divider"></div>
  <div class="mesa-row">
    <span class="mesa">${locationLabel}</span>
    <span class="time">${date} — ${time}</span>
  </div>
  <div class="divider"></div>
  <table>${itemsHtml}</table>
  ${notesHtml}
  ${hasTotal ? '<div class="divider"></div>' : ""}
  ${totalHtml}
  ${pixHtml}
  ${customerHtml}
  <div class="divider"></div>
  <div class="footer">* ${storeName.toUpperCase()} *</div>
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
    // Native platform: try direct native print even without btDevice object
    const { isNativePlatform } = await import("@/lib/bluetoothPrinter");
    if (isNativePlatform()) {
      try {
        const native = await import("@/lib/nativeBluetooth");
        await native.ensureNativeConnection();
        if (native.isNativeConnected()) {
          const success = await native.sendToNativePrinter(text);
          if (success) {
            toast.success("Impresso via Bluetooth");
            return;
          }
        }
      } catch (err) {
        console.warn("[PrintOrder] Native direct print failed:", err);
      }
    }

    // Web path: use btDevice normally
    if (btDevice) {
      const success = await sendToBluetoothPrinter(btDevice, text);
      if (success) {
        toast.success("Impresso via Bluetooth");
        return;
      }
      toast.warning("Bluetooth falhou, salvando na fila...", {
        description: "Verifique se a impressora está ligada e próxima.",
      });
    } else if (!isNativePlatform()) {
      toast.warning("Nenhuma impressora Bluetooth pareada, salvando na fila...");
    }
    // Fallback to queue
    try {
      await enqueuePrint(orgId, order.id, stripFormatMarkers(text));
      toast.info("Pedido salvo na fila de impressão");
    } catch {
      toast.error("Erro ao salvar na fila de impressão");
    }
  }
}
