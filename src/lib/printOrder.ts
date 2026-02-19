import QRCode from "qrcode";

export interface PrintableOrder {
  id: string;
  table_number: number;
  created_at: string;
  notes?: string | null;
  order_items?: Array<{ id: string; name: string; quantity: number; price?: number }>;
}

// ─── PIX Payload Builder (EMV / QRCPS-MPM — Banco Central do Brasil) ─────────

function emvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

function buildPixPayload(pixKey: string, amount: number, storeName: string): string {
  const merchantAccountInfo = emvField(
    "26",
    emvField("00", "BR.GOV.BCB.PIX") + emvField("01", pixKey)
  );

  const amountStr = amount.toFixed(2);
  const storeNameClean = storeName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .substring(0, 25)
    .toUpperCase()
    .trim() || "LOJA";

  let payload =
    emvField("00", "01") +        // Payload Format Indicator
    emvField("01", "12") +        // Point of Initiation Method (dynamic)
    merchantAccountInfo +
    emvField("52", "0000") +      // Merchant Category Code
    emvField("53", "986") +       // Transaction Currency (BRL)
    emvField("54", amountStr) +   // Transaction Amount
    emvField("58", "BR") +        // Country Code
    emvField("59", storeNameClean) + // Merchant Name
    emvField("60", "SAO PAULO") + // Merchant City
    emvField("62", emvField("05", "***")) + // Additional Data Field
    "6304";                        // CRC placeholder

  payload += crc16(payload);
  return payload;
}

// ─── Notes parser ─────────────────────────────────────────────────────────────

interface ParsedNotes {
  tipo?: string;
  name?: string;
  phone?: string;
  address?: string;
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
    payment: parts["PGTO"] || undefined,
    doc: parts["DOC"] || undefined,
    obs: parts["OBS"] || undefined,
  };
}

// ─── Main print function ───────────────────────────────────────────────────────

export async function printOrder(
  order: PrintableOrder,
  storeName = "Cozinha",
  pixKey?: string | null
) {
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
          <td class="name">${item.name}</td>
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

  // Generate PIX QR Code
  let pixHtml = "";
  if (pixKey && hasTotal) {
    try {
      const pixPayload = buildPixPayload(pixKey, total, storeName);
      const qrDataUrl = await QRCode.toDataURL(pixPayload, {
        width: 200,
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
      font-size: 14px;
      width: 80mm;
      padding: 6mm 4mm;
      color: #000;
    }
    .header {
      text-align: center;
      margin-bottom: 8px;
    }
    .store-name {
      font-size: 16px;
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
      font-size: 22px;
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
      font-size: 16px;
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
      width: 160px;
      height: 160px;
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
    .footer {
      text-align: center;
      margin-top: 8px;
      font-size: 11px;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #555;
    }
    @media print {
      body { width: 80mm; }
      @page { margin: 0; size: 80mm auto; }
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
  <div class="footer">★ novo pedido — kds ★</div>
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
