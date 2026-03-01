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
    <section className="animate-admin-fade-in admin-delay-2">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-sm font-bold text-foreground">Período de Trial</h2>
      </div>
      <div className="admin-glass rounded-2xl p-5 hover:shadow-lg transition-all duration-300">
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          Duração padrão do trial para novas lojas. Novas organizações receberão esse número de dias com acesso Pro.
        </p>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Input
              type="number"
              min={0}
              max={365}
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 0)}
              className="h-10 w-28 text-sm font-semibold bg-muted/40 border-0 focus-visible:ring-1 pr-12"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">dias</span>
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2 rounded-xl hover:scale-105 transition-transform">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </Button>
        </div>
      </div>
    </section>
  );
}
