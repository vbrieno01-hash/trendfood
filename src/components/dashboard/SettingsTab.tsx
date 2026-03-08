import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, ShieldAlert, Mail, KeyRound, Store } from "lucide-react";
import { toast } from "sonner";

export default function SettingsTab() {
  const { user, signOut, organization: currentOrg, refreshOrganization } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);
  const [forceOpenLoading, setForceOpenLoading] = useState(false);

  // Load current force_open state
  useEffect(() => {
    if (currentOrg?.id) {
      supabase
        .from("organizations")
        .select("force_open")
        .eq("id", currentOrg.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setForceOpen(!!(data as any).force_open);
        });
    }
  }, [currentOrg?.id]);

  const handleToggleForceOpen = async (checked: boolean) => {
    if (!currentOrg?.id) return;
    setForceOpenLoading(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ force_open: checked } as any)
        .eq("id", currentOrg.id);
      if (error) throw error;
      setForceOpen(checked);
      await refreshOrganization();
      toast.success(checked ? "Loja forçada como ABERTA 24h." : "Horário de funcionamento normal restaurado.");
    } catch {
      toast.error("Erro ao alterar configuração.");
    } finally {
      setForceOpenLoading(false);
    }
  };

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
      await signOut();
      toast.info("Conta desativada. Entre em contato para exclusão completa dos dados.");
      navigate("/auth", { replace: true });
    } catch {
      toast.error("Erro ao excluir conta.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div className="animate-dashboard-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Gerencie sua conta e segurança</p>
      </div>

      {/* Account info */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/30">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informações da conta</p>
        </div>
        <div className="px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">E-mail</p>
            <p className="text-sm font-medium text-foreground">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Force Open Toggle */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <Store className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Controle manual</p>
        </div>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Forçar Loja Aberta</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-[260px]">
                {forceOpen
                  ? "A loja está aberta 24h, ignorando o horário programado."
                  : "Ative para manter a loja aberta manualmente, ignorando qualquer regra de horário."}
              </p>
            </div>
            <Switch
              checked={forceOpen}
              onCheckedChange={handleToggleForceOpen}
              disabled={forceOpenLoading}
            />
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Alterar senha</p>
        </div>
        <div className="px-4 py-4">
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
            <Button type="submit" disabled={pwdLoading} className="h-10">
              {pwdLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando...</> : "Alterar senha"}
            </Button>
          </form>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-destructive/40 overflow-hidden">
        <div className="px-4 py-3 border-b border-destructive/20 bg-destructive/5 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-destructive" />
          <p className="text-xs font-semibold uppercase tracking-wider text-destructive">Zona de Perigo</p>
        </div>
        <div className="px-4 py-4">
          <p className="text-sm text-muted-foreground mb-1 font-medium">Excluir minha conta</p>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            Ao excluir sua conta, sua lanchonete, cardápio e todas as sugestões de clientes serão perdidos permanentemente. Esta ação <strong>não pode ser desfeita</strong>.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={deleteLoading} className="h-10">
                {deleteLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Excluindo...</> : "Excluir minha conta"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Sua lanchonete e todas as sugestões serão perdidas permanentemente. Esta ação não pode ser desfeita.
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
    </div>
  );
}
