import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
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
import { Loader2, ShieldAlert, Mail, KeyRound, CreditCard, Zap } from "lucide-react";
import { toast } from "sonner";

export default function SettingsTab() {
  const { user, session, organization, signOut } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const currentPlan = organization?.subscription_plan || "free";
  const isFree = currentPlan === "free";

  const planLabels: Record<string, string> = {
    free: "Grátis",
    pro: "Pro",
    enterprise: "Enterprise",
  };

  const handleManageSubscription = async () => {
    if (isFree) {
      navigate("/planos");
      return;
    }
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) {
        if (error instanceof FunctionsHttpError) {
          const errorBody = await error.context.json();
          if (errorBody?.error?.includes("No Stripe customer found")) {
            toast.error("Nenhuma assinatura encontrada. Assine um plano para gerenciar.");
            navigate("/planos");
            return;
          }
          throw new Error(errorBody?.error || "Erro ao abrir portal.");
        }
        throw error;
      }

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      const msg = error.message ?? "";
      if (msg.includes("No Stripe customer found")) {
        toast.error("Nenhuma assinatura encontrada. Assine um plano para gerenciar sua assinatura.");
        navigate("/planos");
      } else {
        toast.error(msg || "Erro ao abrir portal de assinatura.");
      }
    } finally {
      setPortalLoading(false);
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
      <div>
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

      {/* Subscription */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assinatura</p>
        </div>
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plano atual</p>
              <p className="text-sm font-medium text-foreground">{planLabels[currentPlan] || currentPlan}</p>
            </div>
          </div>
          <Button
            variant={isFree ? "default" : "outline"}
            size="sm"
            onClick={handleManageSubscription}
            disabled={portalLoading}
            className="h-9 gap-2"
          >
            {portalLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Abrindo...</>
            ) : isFree ? (
              <><Zap className="w-4 h-4" /> Fazer upgrade</>
            ) : (
              "Gerenciar assinatura"
            )}
          </Button>
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
