import { useState, useEffect } from "react";
import { usePlatformDeliveryConfig, useUpdatePlatformDeliveryConfig } from "@/hooks/usePlatformDeliveryConfig";
import { DeliveryConfig } from "@/hooks/useDeliveryFee";
import { Settings, Save, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const FIELDS: { key: keyof DeliveryConfig; label: string; prefix?: string; suffix?: string }[] = [
  { key: "fee_tier1", label: "Taxa Faixa 1", prefix: "R$" },
  { key: "tier1_km", label: "Até (km)", suffix: "km" },
  { key: "fee_tier2", label: "Taxa Faixa 2", prefix: "R$" },
  { key: "tier2_km", label: "Até (km)", suffix: "km" },
  { key: "fee_tier3", label: "Taxa Faixa 3", prefix: "R$" },
  { key: "free_above", label: "Frete grátis acima de", prefix: "R$" },
];

export default function PlatformConfigSection() {
  const { data: config, isLoading } = usePlatformDeliveryConfig();
  const updateMutation = useUpdatePlatformDeliveryConfig();
  const [form, setForm] = useState<DeliveryConfig | null>(null);

  useEffect(() => {
    if (config && !form) setForm({ ...config });
  }, [config, form]);

  if (isLoading || !form) return null;

  function handleChange(key: keyof DeliveryConfig, val: string) {
    setForm((prev) => prev ? { ...prev, [key]: parseFloat(val) || 0 } : prev);
  }

  async function handleSave() {
    if (!form) return;
    try {
      await updateMutation.mutateAsync(form);
      toast.success("Configurações salvas com sucesso!");
    } catch {
      toast.error("Erro ao salvar configurações");
    }
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Configurações da Plataforma</h2>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-xs text-muted-foreground mb-4">Taxas de entrega padrão aplicadas a novas lojas</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{f.label}</label>
              <div className="relative">
                {f.prefix && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{f.prefix}</span>
                )}
                <Input
                  type="number"
                  step="0.01"
                  value={form[f.key]}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  className={`h-9 text-sm ${f.prefix ? "pl-9" : ""} ${f.suffix ? "pr-9" : ""}`}
                />
                {f.suffix && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{f.suffix}</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending} className="mt-4" size="sm">
          {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Configurações
        </Button>
      </div>
    </section>
  );
}
