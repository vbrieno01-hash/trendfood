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

  return (
    <div className="bg-white text-black font-mono text-[11px] leading-snug p-4 rounded-lg border-2 border-dashed border-muted-foreground/30 max-w-[320px] mx-auto whitespace-pre-wrap shadow-sm">
      <div className="text-center font-bold">{storeName.toUpperCase() || "NOME DA LOJA"}</div>
      {storeAddress && <div className="text-center">{storeAddress}</div>}
      {storeContact && <div className="text-center">{storeContact}</div>}
      {cnpj && <div className="text-center">{cnpj}</div>}
      <div className="border-t border-black my-1" />
      <div className="text-center">{date} {time}</div>
      <div className="text-center">SIMPLES CONFERÊNCIA DA CONTA</div>
      <div className="text-center">RELATÓRIO GERENCIAL</div>
      <div className="text-center">* * * NÃO É DOCUMENTO FISCAL * * *</div>
      <div className="border-t border-dashed border-black my-1" />
      <div>1x Produto exemplo      R$ 10,00</div>
      <div className="border-t border-dashed border-black my-1" />
      <div className="font-bold text-right">TOTAL: R$ 10,00</div>
      <div className="border-t border-dashed border-black my-1" />
      <div className="text-muted-foreground/70">
        <div>Nome: (nome do cliente)</div>
        <div>Tel: (telefone)</div>
        <div>End.: (endereço)</div>
        <div>Frete: R$ 0,00</div>
        <div>Pgto: (forma)</div>
        <div>CPF/CNPJ: (documento)</div>
        <div>Obs: (observação)</div>
      </div>
      <div className="border-t border-dashed border-black my-1" />
      <div className="text-center">* Obrigado pela preferência *</div>
      <div className="text-center">Volte sempre!</div>
      <div className="text-center font-bold">TrendFood</div>
    </div>
  );
}
