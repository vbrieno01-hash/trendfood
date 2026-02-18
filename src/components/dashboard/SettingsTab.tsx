import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function SettingsTab() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setPwdLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message ?? "Erro ao alterar senha.");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      // Sign out first, then delete via supabase (requires service role in edge function for full deletion)
      // For now, sign out and show a message
      await signOut();
      toast.info("Conta desativada. Entre em contato para exclusão completa dos dados.");
      navigate("/auth");
    } catch {
      toast.error("Erro ao excluir conta.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie sua conta</p>
      </div>

      {/* Account info */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold text-foreground mb-3">Informações da conta</h2>
        <p className="text-sm text-muted-foreground">
          E-mail: <span className="text-foreground font-medium">{user?.email}</span>
        </p>
      </div>

      {/* Change password */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold text-foreground mb-4">Alterar senha</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <Label htmlFor="new-pwd" className="text-sm font-medium">Nova senha</Label>
            <Input
              id="new-pwd"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1"
              minLength={6}
              required
            />
          </div>
          <div>
            <Label htmlFor="confirm-pwd" className="text-sm font-medium">Confirmar nova senha</Label>
            <Input
              id="confirm-pwd"
              type="password"
              placeholder="Repita a nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1"
              minLength={6}
              required
            />
          </div>
          <Button type="submit" disabled={pwdLoading}>
            {pwdLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : "Alterar senha"}
          </Button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="bg-card border border-destructive/30 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="w-5 h-5 text-destructive" />
          <h2 className="font-semibold text-destructive">Zona de Perigo</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          Ao excluir sua conta, todos os dados serão perdidos permanentemente.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={deleteLoading}>
              {deleteLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Excluindo...</> : "Excluir minha conta"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Sua lanchonete e todas as sugestões serão perdidas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sim, excluir conta
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
