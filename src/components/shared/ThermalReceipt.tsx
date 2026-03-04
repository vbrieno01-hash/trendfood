/**
 * UNIFIED Thermal Receipt Component.
 * Used by:
 *   - ReceiptPreview (dashboard settings) — with demo data
 *   - printOrder (browser window.print) — rendered to HTML string
 *
 * ANY layout change here automatically propagates everywhere.
 */

import type { ReceiptData } from "@/lib/receiptData";

interface ThermalReceiptProps {
  data: ReceiptData;
}

const fmt = (n: number) => n.toFixed(2).replace(".", ",");

/** Sanitize for thermal preview: strip diacritics, uppercase */
const san = (text: string) =>
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

export default function ThermalReceipt({ data }: ThermalReceiptProps) {
  return (
    <div className="bg-white text-black font-mono text-[11px] leading-snug p-4 rounded-lg border-2 border-dashed border-muted-foreground/30 max-w-[320px] mx-auto whitespace-pre-wrap shadow-sm uppercase">
      {/* ── CABECALHO ── */}
      <div className="text-center font-bold text-[14px]">{san(data.locationLabel)}</div>
      <div className="text-center">{data.date} {data.time}</div>
      {data.showEta && data.eta1 && data.eta2 && (
        <div className="text-center">{san(`Previsao: ${data.eta1} - ${data.eta2}`)}</div>
      )}
      <div className="text-center font-bold text-[13px] mt-1">
        {san(data.storeName)}
      </div>
      {data.storeAddress && <div className="text-center">{san(data.storeAddress)}</div>}
      {data.storeContact && <div className="text-center">{san(data.storeContact)}</div>}
      {data.cnpj && <div className="text-center">CNPJ: {data.cnpj}</div>}
      {data.orderNumber && (
        <div className="text-center font-bold text-[16px] mt-1">PEDIDO #{data.orderNumber}</div>
      )}

      {/* ── ITENS ── */}
      <div className="border-t border-dashed border-black my-2 pt-1" />
      {data.items.map((item) => (
        <div key={item.index}>
          <div>
            {item.quantity}x {san(item.customerName ? `${item.baseName} - ${item.customerName}` : item.baseName)}
            {item.lineTotal > 0 && `......R$ ${fmt(item.lineTotal)}`}
          </div>
          {item.addons.map((addon, i) => (
            <div key={i} className="pl-3">- {san(addon)}</div>
          ))}
          {item.itemObs && (
            <div className="pl-3 italic">{san(`Obs: ${item.itemObs}`)}</div>
          )}
        </div>
      ))}

      {/* ── OBS GERAL ── */}
      {data.generalObs && (
        <div className="mt-1 border border-black px-1">{san(`Obs: ${data.generalObs}`)}</div>
      )}

      {/* ── DADOS DO CLIENTE ── */}
      {data.customer && (
        <>
          <div className="border-t border-dashed border-black my-2 pt-1" />
          {data.customer.name && <div>{san(`Nome: ${data.customer.name}`)}</div>}
          {data.customer.phone && <div>Tel: {data.customer.phone}</div>}
          {data.customer.doc && <div>CPF/CNPJ: {data.customer.doc}</div>}
          {data.customer.address && <div>{san(`End.: ${data.customer.address}`)}</div>}
          {data.customer.bairro && <div>{san(`Bairro: ${data.customer.bairro}`)}</div>}
          {data.customer.reference && (
            <div className="font-bold">{san(`Ref.: ${data.customer.reference}`)}</div>
          )}
        </>
      )}

      {/* ── PAGAMENTO & TOTAIS ── */}
      <div className="border-t border-dashed border-black my-2 pt-1" />
      {data.paymentMethod && (
        <>
          <div className="text-center">{san(`Pgto: ${data.paymentMethod}`)}</div>
          {data.showChargeNotice && (
            <div className="text-center font-bold">* COBRAR DO CLIENTE *</div>
          )}
        </>
      )}
      {data.totals.subtotal > 0 && (
        <>
          {(data.totals.deliveryFee > 0 || data.totals.deliveryFeeLabel) && (
            <>
              <div className="text-right mt-1">SUBTOTAL: R$ {fmt(data.totals.subtotal)}</div>
              <div className="text-right">TX ENTREGA: {san(data.totals.deliveryFeeLabel)}</div>
            </>
          )}
          <div className="text-right font-bold text-[13px]">TOTAL: R$ {fmt(data.totals.grandTotal)}</div>
        </>
      )}
      {data.troco && <div className="text-right">{san(`Troco para: ${data.troco}`)}</div>}
      {data.trocoChange != null && data.trocoChange > 0 && (
        <div className="text-right font-bold">LEVAR DE TROCO: R$ {fmt(data.trocoChange)}</div>
      )}

      {/* ── RODAPE ── */}
      <div className="border-t border-dashed border-black my-2 pt-1" />
      <div className="text-center font-bold">BOM APETITE</div>
      <div className="text-center mt-1">POWERED BY: TRENDFOOD</div>
      <div className="text-center text-[10px] mt-1">ACESSE: HTTPS://TRENDFOOD.LOVABLE.APP/</div>
    </div>
  );
}
