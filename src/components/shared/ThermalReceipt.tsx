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

export default function ThermalReceipt({ data }: ThermalReceiptProps) {
  return (
    <div className="bg-white text-black font-mono text-[11px] leading-snug p-4 rounded-lg border-2 border-dashed border-muted-foreground/30 max-w-[320px] mx-auto whitespace-pre-wrap shadow-sm">
      {/* ── CABEÇALHO ── */}
      <div className="text-center font-bold text-[14px]">{data.locationLabel}</div>
      <div className="text-center">{data.date} {data.time}</div>
      {data.showEta && data.eta1 && data.eta2 && (
        <div className="text-center">Previsão: {data.eta1} - {data.eta2}</div>
      )}
      <div className="text-center font-bold text-[13px] mt-1">
        {data.storeName.toUpperCase()}
      </div>
      {data.storeAddress && <div className="text-center">{data.storeAddress}</div>}
      {data.storeContact && <div className="text-center">{data.storeContact}</div>}
      {data.cnpj && <div className="text-center">CNPJ: {data.cnpj}</div>}
      {data.orderNumber && (
        <div className="text-center font-bold text-[16px] mt-1">PEDIDO #{data.orderNumber}</div>
      )}

      {/* ── ITENS ── */}
      <div className="border-t border-dashed border-black my-2 pt-1" />
      {data.items.map((item) => (
        <div key={item.index}>
          <div>
            {item.index}) {item.customerName ? `${item.baseName} - ${item.customerName}` : item.baseName}
            {item.lineTotal > 0 && `......R$ ${fmt(item.lineTotal)}`}
          </div>
          {item.addons.map((addon, i) => (
            <div key={i} className="pl-3">- {addon}</div>
          ))}
          {item.itemObs && (
            <div className="pl-3 italic">Obs: {item.itemObs}</div>
          )}
        </div>
      ))}

      {/* ── OBS GERAL ── */}
      {data.generalObs && (
        <div className="mt-1 border border-black px-1">Obs: {data.generalObs}</div>
      )}

      {/* ── DADOS DO CLIENTE ── */}
      {data.customer && (
        <>
          <div className="border-t border-dashed border-black my-2 pt-1" />
          {data.customer.name && <div>Nome: {data.customer.name}</div>}
          {data.customer.phone && <div>Tel: {data.customer.phone}</div>}
          {data.customer.doc && <div>CPF/CNPJ: {data.customer.doc}</div>}
          {data.customer.address && <div>End.: {data.customer.address}</div>}
          {data.customer.bairro && <div>Bairro: {data.customer.bairro}</div>}
          {data.customer.reference && (
            <div className="font-bold">Ref.: {data.customer.reference}</div>
          )}
        </>
      )}

      {/* ── PAGAMENTO & TOTAIS ── */}
      <div className="border-t border-dashed border-black my-2 pt-1" />
      {data.paymentMethod && (
        <>
          <div className="text-center">Pgto: {data.paymentMethod}</div>
          {data.showChargeNotice && (
            <div className="text-center font-bold">* Cobrar do cliente *</div>
          )}
        </>
      )}
      {data.totals.subtotal > 0 && (
        <>
          {(data.totals.deliveryFee > 0 || data.totals.deliveryFeeLabel) && (
            <>
              <div className="text-right mt-1">Subtotal: R$ {fmt(data.totals.subtotal)}</div>
              <div className="text-right">Tx Entrega: {data.totals.deliveryFeeLabel}</div>
            </>
          )}
          <div className="text-right font-bold text-[13px]">TOTAL: R$ {fmt(data.totals.grandTotal)}</div>
        </>
      )}
      {data.troco && <div className="text-right">Troco para: {data.troco}</div>}

      {/* ── RODAPÉ ── */}
      <div className="border-t border-dashed border-black my-2 pt-1" />
      <div className="text-center font-bold">Bom apetite!!!</div>
      <div className="text-center mt-1">Powered By: TrendFood</div>
      <div className="text-center text-[10px] mt-1">Acesse: https://trendfood.lovable.app/</div>
    </div>
  );
}
