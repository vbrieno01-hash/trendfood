import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Clock, Save, Loader2 } from "lucide-react";

export default function TrialConfigSection() {
  const [days, setDays] = useState<number>(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("platform_config")
      .select("default_trial_days")
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setDays((data as any).default_trial_days ?? 7);
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("platform_config")
      .update({ default_trial_days: days } as any)
      .eq("id", "singleton");
    setSaving(false);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Dias de trial atualizados!");
  }

  if (loading) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Período de Trial</h2>
      </div>
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-xs text-muted-foreground mb-3">
          Duração padrão do trial para novas lojas. Novas organizações receberão esse número de dias com acesso Pro.
        </p>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            min={0}
            max={365}
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value) || 0)}
            className="h-9 w-24 text-sm"
          />
          <span className="text-sm text-muted-foreground">dias</span>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </Button>
        </div>
      </div>
    </section>
  );
}
