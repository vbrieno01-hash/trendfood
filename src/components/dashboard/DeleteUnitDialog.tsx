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
      // Delete child data in order
      const orderIds = await supabase.from("orders").select("id").eq("organization_id", orgId);
      if (orderIds.data?.length) {
        await supabase.from("order_items").delete().in("order_id", orderIds.data.map((o) => o.id));
      }
      await supabase.from("orders").delete().eq("organization_id", orgId);
      await supabase.from("menu_items").delete().eq("organization_id", orgId);
      await supabase.from("tables").delete().eq("organization_id", orgId);
      await supabase.from("cash_withdrawals").delete().eq("organization_id", orgId);
      await supabase.from("cash_sessions").delete().eq("organization_id", orgId);
      await supabase.from("coupons").delete().eq("organization_id", orgId);
      await supabase.from("suggestions").delete().eq("organization_id", orgId);
      await supabase.from("organization_secrets").delete().eq("organization_id", orgId);

      const { error } = await supabase.from("organizations").delete().eq("id", orgId);
      if (error) {
        toast.error("Erro ao excluir unidade: " + error.message);
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
