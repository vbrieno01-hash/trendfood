import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ManageSubscriptionDialogProps {
  org: {
    id: string;
    name: string;
    subscription_plan: string;
    subscription_status: string;
    trial_ends_at: string | null;
  };
  onSaved: (updated: {
    subscription_plan: string;
    subscription_status: string;
    trial_ends_at: string | null;
  }) => void;
}

const PLAN_OPTIONS = [
  { value: "free", label: "Grátis" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
  { value: "lifetime", label: "Vitalício" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Ativo" },
  { value: "past_due", label: "Vencido" },
];

export default function ManageSubscriptionDialog({ org, onSaved }: ManageSubscriptionDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState(org.subscription_plan);
  const [status, setStatus] = useState(org.subscription_status);
  const [trialDate, setTrialDate] = useState<Date | undefined>(
    org.trial_ends_at ? new Date(org.trial_ends_at) : undefined
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setPlan(org.subscription_plan);
      setStatus(org.subscription_status);
      setTrialDate(org.trial_ends_at ? new Date(org.trial_ends_at) : undefined);
      setNotes("");
    }
    setOpen(isOpen);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        subscription_plan: plan,
        subscription_status: status,
        trial_ends_at: trialDate ? trialDate.toISOString() : null,
      };

      const { error } = await supabase
        .from("organizations")
        .update(updateData)
        .eq("id", org.id);

      if (error) throw error;

      // Log activation
      await (supabase.from("activation_logs") as any).insert({
        organization_id: org.id,
        org_name: org.name,
        old_plan: org.subscription_plan,
        new_plan: plan,
        old_status: org.subscription_status,
        new_status: status,
        source: "manual",
        admin_email: user?.email || null,
        notes: notes || null,
      });

      // ── Referral bonus: when activating a paid plan ──
      const paidPlans = ["pro", "enterprise", "lifetime"];
      const wasNotActive = org.subscription_status !== "active" || !paidPlans.includes(org.subscription_plan);
      const isNowActivePaid = status === "active" && paidPlans.includes(plan);

      if (wasNotActive && isNowActivePaid) {
        try {
          const { data: activatedOrg } = await supabase
            .from("organizations")
            .select("referred_by_id")
            .eq("id", org.id)
            .single();

          if (activatedOrg?.referred_by_id) {
            const referrerId = activatedOrg.referred_by_id;

            const { data: existing } = await (supabase.from("referral_bonuses") as any)
              .select("id")
              .eq("referrer_org_id", referrerId)
              .eq("referred_org_id", org.id)
              .maybeSingle();

            if (!existing) {
              await (supabase.from("referral_bonuses") as any).insert({
                referrer_org_id: referrerId,
                referred_org_id: org.id,
                bonus_days: 10,
                referred_org_name: org.name,
              });

              const { data: referrerOrg } = await supabase
                .from("organizations")
                .select("trial_ends_at, name")
                .eq("id", referrerId)
                .single();

              if (referrerOrg) {
                const currentExpiry = referrerOrg.trial_ends_at
                  ? new Date(referrerOrg.trial_ends_at)
                  : new Date();
                const newExpiry = new Date(currentExpiry.getTime() + 10 * 24 * 60 * 60 * 1000);

                await supabase
                  .from("organizations")
                  .update({ trial_ends_at: newExpiry.toISOString() })
                  .eq("id", referrerId);

                await (supabase.from("activation_logs") as any).insert({
                  organization_id: referrerId,
                  org_name: referrerOrg.name || null,
                  source: "referral_bonus",
                  notes: `+10 dias por indicar "${org.name}" (org ${org.id})`,
                });
              }
            }
          }
        } catch (refErr) {
          console.error("[ManageSubscription] Referral bonus error:", refErr);
        }
      }

      onSaved({
        subscription_plan: plan,
        subscription_status: status,
        trial_ends_at: trialDate ? trialDate.toISOString() : null,
      });

      toast.success("Assinatura atualizada!");
      setOpen(false);
    } catch (err) {
      toast.error("Erro ao salvar alterações");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
          <Settings2 className="w-3 h-3" />
          Gerenciar
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Assinatura</DialogTitle>
          <DialogDescription>{org.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Plano</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAN_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Trial até</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !trialDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {trialDate ? format(trialDate, "dd/MM/yyyy") : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={trialDate}
                  onSelect={setTrialDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo da alteração..."
              className="h-20 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
