/**
 * ReceiptPreview — thin wrapper around the unified ThermalReceipt.
 * Uses demo data so the lojista can preview the layout.
 * Any layout change in ThermalReceipt automatically updates this preview.
 */

import ThermalReceipt from "@/components/shared/ThermalReceipt";
import { buildDemoReceiptData } from "@/lib/receiptData";

interface ReceiptPreviewProps {
  storeName: string;
  storeAddress: string;
  storeContact: string;
  cnpj: string;
}

export default function ReceiptPreview({ storeName, storeAddress, storeContact, cnpj }: ReceiptPreviewProps) {
  const data = buildDemoReceiptData({
    name: storeName,
    address: storeAddress || undefined,
    contact: storeContact || undefined,
    cnpj: cnpj || undefined,
  });

  return <ThermalReceipt data={data} />;
}
