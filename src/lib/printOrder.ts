export interface PrintableOrder {
  id: string;
  table_number: number;
  created_at: string;
  notes?: string | null;
  order_items?: Array<{ id: string; name: string; quantity: number }>;
}

export function printOrder(order: PrintableOrder, storeName = "Cozinha") {
  const win = window.open("", "_blank", "width=400,height=600");
  if (!win) return; // blocked by popup blocker

  const date = new Date(order.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

  const time = new Date(order.created_at).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const itemsHtml = (order.order_items ?? [])
    .map(
      (item) =>
        `<tr>
          <td class="qty">${item.quantity}x</td>
          <td class="name">${item.name}</td>
        </tr>`
    )
    .join("");

  const notesHtml = order.notes
    ? `<div class="notes"><strong>Obs:</strong> ${order.notes}</div>`
    : "";

  const locationLabel = order.table_number === 0 ? "ENTREGA" : `MESA ${order.table_number}`;

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
    .notes {
      margin-top: 6px;
      font-size: 12px;
      background: #f5f5f5;
      border: 1px solid #ccc;
      padding: 4px 6px;
      border-radius: 2px;
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
  <div class="divider"></div>
  <div class="footer">★ novo pedido — kds ★</div>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
  win.focus();
  // Small delay so the document renders before print dialog opens
  setTimeout(() => {
    win.print();
    win.close();
  }, 300);
}
