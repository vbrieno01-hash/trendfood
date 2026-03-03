import { supabase } from "@/integrations/supabase/client";

export async function enqueuePrint(
  orgId: string,
  orderId: string | null,
  contentText: string
): Promise<void> {
  const { error } = await supabase.from("fila_impressao" as any).insert({
    organization_id: orgId,
    order_id: orderId,
    conteudo_txt: contentText,
    status: "pendente",
  } as any);

  if (error) {
    console.error("Failed to enqueue print job for org:", orgId, error);
    throw error;
  }
}

export async function markAsPrinted(printId: string): Promise<void> {
  const { error } = await supabase
    .from("fila_impressao" as any)
    .update({ status: "impresso", printed_at: new Date().toISOString() } as any)
    .eq("id", printId);

  if (error) {
    console.error("Failed to mark as printed:", error);
    throw error;
  }
}

/** Cancel all pending print jobs for a given order */
export async function cancelPendingPrints(orderId: string): Promise<void> {
  const { error } = await supabase
    .from("fila_impressao" as any)
    .update({ status: "cancelado" } as any)
    .eq("order_id", orderId)
    .eq("status", "pendente");

  if (error) {
    console.error("Failed to cancel pending prints for order:", orderId, error);
  }
}
