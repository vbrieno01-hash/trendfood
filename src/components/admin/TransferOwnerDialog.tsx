import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowRightLeft } from "lucide-react";

interface TransferOwnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  orgName: string;
  onTransferred: (newEmail: string) => void;
}

export default function TransferOwnerDialog({ open, onOpenChange, orgId, orgName, onTransferred }: TransferOwnerDialogProps) {
  const [email, setEmail] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("transfer-org-owner", {
        body: { organization_id: orgId, new_email: email.trim() },
      });

      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Erro ao transferir");
        setConfirming(false);
        return;
      }

      toast.success(`Loja "${orgName}" transferida para ${data.new_email}`);
      onTransferred(data.new_email);
      onOpenChange(false);
      setEmail("");
      setConfirming(false);
    } catch {
      toast.error("Erro inesperado ao transferir");
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setConfirming(false); setEmail(""); } onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            Transferir Loja
          </DialogTitle>
          <DialogDescription>
            Transferir a loja <strong>{orgName}</strong> para outra conta. O novo dono precisa já ter uma conta criada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Input
            type="email"
            placeholder="Email do novo dono"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setConfirming(false); }}
            disabled={loading}
          />
          {confirming && (
            <p className="text-sm text-destructive font-medium">
              Tem certeza que deseja transferir "{orgName}" para {email.trim()}? Essa ação é imediata.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!email.trim() || loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            {confirming ? "Confirmar Transferência" : "Transferir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
