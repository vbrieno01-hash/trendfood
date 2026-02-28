import { useState } from "react";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface DeleteUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  orgName: string;
  onDeleted: () => Promise<void>;
}

export default function DeleteUnitDialog({ open, onOpenChange, orgId, orgName, onDeleted }: DeleteUnitDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // 1. Fetch order IDs and menu_item IDs for cascading deletes
      const [orderIds, menuItemIds] = await Promise.all([
        supabase.from("orders").select("id").eq("organization_id", orgId),
        supabase.from("menu_items").select("id").eq("organization_id", orgId),
      ]);

      // 2. Delete order_items (depends on orders)
      if (orderIds.data?.length) {
        await supabase.from("order_items").delete().in("order_id", orderIds.data.map((o) => o.id));
      }

      // 3. Delete menu_item_addons & menu_item_ingredients (depends on menu_items)
      if (menuItemIds.data?.length) {
        const ids = menuItemIds.data.map((m) => m.id);
        await Promise.all([
          supabase.from("menu_item_addons").delete().in("menu_item_id", ids),
          supabase.from("menu_item_ingredients").delete().in("menu_item_id", ids),
        ]);
      }

      // 4. Delete deliveries (depends on orders)
      await supabase.from("deliveries").delete().eq("organization_id", orgId);

      // 5. Delete all remaining child tables
      await Promise.all([
        supabase.from("orders").delete().eq("organization_id", orgId),
        supabase.from("menu_items").delete().eq("organization_id", orgId),
        supabase.from("tables").delete().eq("organization_id", orgId),
        supabase.from("cash_withdrawals").delete().eq("organization_id", orgId),
        supabase.from("cash_sessions").delete().eq("organization_id", orgId),
        supabase.from("coupons").delete().eq("organization_id", orgId),
        supabase.from("suggestions").delete().eq("organization_id", orgId),
        supabase.from("organization_secrets").delete().eq("organization_id", orgId),
        supabase.from("stock_items").delete().eq("organization_id", orgId),
        supabase.from("courier_shifts").delete().eq("organization_id", orgId),
        supabase.from("couriers").delete().eq("organization_id", orgId),
        supabase.from("fila_impressao").delete().eq("organization_id", orgId),
        supabase.from("device_tokens").delete().eq("org_id", orgId),
        supabase.from("whatsapp_instances").delete().eq("organization_id", orgId),
      ]);

      // 6. Delete the organization itself
      const { error } = await supabase.from("organizations").delete().eq("id", orgId);
      if (error) {
        toast.error("Erro ao excluir unidade: " + error.message);
        return;
      }

      // 7. Verify deletion
      const { data: check } = await supabase.from("organizations").select("id").eq("id", orgId).maybeSingle();
      if (check) {
        toast.error("Falha ao excluir: a unidade ainda existe. Verifique suas permissões.");
        return;
      }

      toast.success(`Unidade "${orgName}" excluída com sucesso.`);
      onOpenChange(false);
      await onDeleted();
    } catch {
      toast.error("Erro inesperado ao excluir unidade.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            Excluir unidade
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span>Tem certeza que deseja excluir <strong className="text-foreground">{orgName}</strong>?</span>
            <span className="block text-destructive font-medium">
              Todos os pedidos, cardápio, mesas e dados serão permanentemente excluídos. Esta ação não pode ser desfeita.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Excluindo..." : "Excluir unidade"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
