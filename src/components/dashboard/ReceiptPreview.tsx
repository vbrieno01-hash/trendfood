interface ReceiptPreviewProps {
  storeName: string;
  storeAddress: string;
  storeContact: string;
  cnpj: string;
}

export default function ReceiptPreview({ storeName, storeAddress, storeContact, cnpj }: ReceiptPreviewProps) {
  const now = new Date();
  const date = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const eta1 = new Date(now.getTime() + 30 * 60000);
  const eta2 = new Date(now.getTime() + 40 * 60000);
  const fmtTime = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const subtotal = 35.00;
  const frete = 6.00;
  const total = subtotal + frete;

  return (
    <div className="bg-white text-black font-mono text-[11px] leading-snug p-4 rounded-lg border-2 border-dashed border-muted-foreground/30 max-w-[320px] mx-auto whitespace-pre-wrap shadow-sm">
      {/* ── CABEÇALHO ── */}
      <div className="text-center font-bold text-[14px]">PARA ENTREGA</div>
      <div className="text-center">{date} {time}</div>
      <div className="text-center">Previsão: {fmtTime(eta1)} - {fmtTime(eta2)}</div>
      <div className="text-center font-bold text-[13px] mt-1">
        {storeName.toUpperCase() || "NOME DA LOJA"}
      </div>
      {storeAddress && <div className="text-center">{storeAddress}</div>}
      {storeContact && <div className="text-center">{storeContact}</div>}
      {cnpj && <div className="text-center">CNPJ: {cnpj}</div>}
      <div className="text-center font-bold text-[16px] mt-1">PEDIDO #42</div>

      {/* ── ITENS ── */}
      <div className="border-t border-dashed border-black my-1" />
      <div>1) X-Burguer............R$ 25,00</div>
      <div className="pl-3">- Bacon</div>
      <div className="pl-3">- Cheddar</div>
      <div>2) Coca-Cola 600ml.....R$ 10,00</div>

      {/* ── OBS GERAL ── */}
      <div className="mt-1 border border-black px-1">Obs: Sem cebola</div>

      {/* ── DADOS DO CLIENTE ── */}
      <div className="border-t border-dashed border-black my-1" />
      <div>Nome: João da Silva</div>
      <div>Tel: (11) 99999-0000</div>
      <div>End.: Rua das Flores, 123, Apto 4</div>
      <div>Bairro: Centro - São Paulo</div>
      <div className="font-bold">Ref.: Próximo ao mercado</div>

      {/* ── PAGAMENTO & TOTAIS ── */}
      <div className="border-t border-dashed border-black my-1" />
      <div className="text-center">Pgto: Dinheiro</div>
      <div className="text-center font-bold">* Cobrar do cliente *</div>
      <div className="text-right mt-1">Subtotal: R$ {subtotal.toFixed(2).replace(".", ",")}</div>
      <div className="text-right">Tx Entrega: R$ {frete.toFixed(2).replace(".", ",")}</div>
      <div className="text-right font-bold text-[13px]">TOTAL: R$ {total.toFixed(2).replace(".", ",")}</div>
      <div className="text-right">Troco para: R$ 50,00</div>

      {/* ── RODAPÉ ── */}
      <div className="border-t border-dashed border-black my-1" />
      <div className="text-center font-bold">Bom apetite!!!</div>
      <div className="text-center mt-1">Powered By: TrendFood</div>
    </div>
  );
}
